import { join } from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { capabilities, releases, roadmap } from "../catalog/product.js";
import type { AppConfig } from "../config/env.js";
import { Repository, secureTokenEquals } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";
import { transitionSource } from "../domain/source-lifecycle.js";
import { clusterSignals } from "../pipeline/cluster.js";
import { collectSources } from "../pipeline/collect.js";
import { evaluateSystem, latestEvaluation } from "../pipeline/evaluate.js";
import { exportStaticSite } from "../pipeline/export.js";
import { runScout } from "../pipeline/scout.js";

const SourcePatch = z.object({
  authorityScore: z.number().int().min(0).max(100).optional(),
  tier: z.number().int().min(1).max(4).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
  baseBackoffMs: z.number().int().min(50).max(30_000).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1_000).optional(),
});

const SourceAction = z.object({
  action: z.enum(["verify", "activate", "degrade", "quarantine", "restore", "retire"]),
});

const SourceDiscoveryQuery = z.object({
  status: z.enum(["pending", "candidate", "matched_source", "merged_signal"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const ScoutPatch = z.object({
  status: z.enum(["inbox", "considering", "accepted", "dismissed", "archived", "published"]),
});

const EventPatch = z.object({
  title: z.string().min(4).max(500).optional(),
  factSummary: z.string().max(4_000).optional(),
  summary: z.string().max(8_000).optional(),
  technicalInsight: z.string().max(8_000).optional(),
  industryInsight: z.string().max(8_000).optional(),
  futureOutlook: z.string().max(8_000).optional(),
  businessValue: z.string().max(8_000).optional(),
  category: z.string().max(50).optional(),
  company: z.string().max(100).optional(),
  keywords: z.array(z.string().max(60)).max(20).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  heatScore: z.number().int().min(0).max(100).optional(),
  impactScore: z.number().int().min(0).max(100).optional(),
  status: z.enum(["draft", "review", "published", "hidden"]).optional(),
  featured: z.boolean().optional(),
});

const TrackPatch = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4_000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  icon: z.string().max(20).optional(),
  orderIndex: z.number().int().min(0).max(10_000).optional(),
  enabled: z.boolean().optional(),
});

const ViewPatch = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4_000).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const ActorPatch = z.object({
  tableScore: z.number().int().min(0).max(100).optional(),
  scale: z.string().max(30).optional(),
  domains: z.array(z.string().max(60)).max(20).optional(),
  enabled: z.boolean().optional(),
});

const ResourcePatch = z.object({
  planName: z.string().max(200).optional(),
  riskLevel: z.enum(["official", "reference", "caution", "high"]).optional(),
  enabled: z.boolean().optional(),
  verifiedAt: z.string().datetime().optional(),
});

export async function buildApp(db: Kysely<DatabaseSchema>, config: AppConfig) {
  const app = Fastify({ logger: { redact: ["req.headers.authorization"] }, bodyLimit: 256 * 1024 });
  const repository = new Repository(db);

  await app.register(cors, { origin: false });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    return payload;
  });

  app.get("/api/health", async () => ({ ok: true, time: new Date().toISOString() }));
  app.get("/api/public/timeline", async () => ({
    schemaVersion: 1,
    events: await repository.publicEvents(),
  }));
  app.get("/api/public/tracks", async () => repository.listTracks());
  app.get("/api/public/actors", async () => repository.listActors());
  app.get("/api/public/resources", async () => repository.listResources());
  app.get("/api/public/scout", async () => ({
    schemaVersion: 1,
    insights: await repository.publicScoutInsights(),
  }));
  app.get("/api/public/product", async () => ({ capabilities, roadmap, releases }));

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/admin")) return;
    if (config.NODE_ENV !== "production" && !config.ADMIN_TOKEN) return;
    if (!config.ADMIN_TOKEN)
      return reply
        .code(503)
        .send({ error: "Admin API is disabled until ADMIN_TOKEN is configured" });
    const actual = bearerToken(request);
    if (!actual || !secureTokenEquals(config.ADMIN_TOKEN, actual))
      return reply.code(401).send({ error: "Invalid admin token" });
  });

  app.get("/api/admin/dashboard", async () => repository.dashboard());
  app.get("/api/admin/sources", async () => repository.listSources());
  app.get("/api/admin/source-runs", async (request) => {
    const query = z.object({ sourceId: z.string().uuid().optional() }).parse(request.query);
    return repository.listSourceRuns(query.sourceId);
  });
  app.get("/api/admin/source-discoveries", async (request, reply) => {
    const query = SourceDiscoveryQuery.parse(request.query);
    const [items, summary] = await Promise.all([
      repository.listSourceDiscoveries(query.limit, query.status),
      repository.discoveryStatusSummary(),
    ]);
    reply.header("Cache-Control", "no-store");
    return { items, summary, filter: { status: query.status ?? "all", limit: query.limit } };
  });
  app.get("/api/admin/events", async () => repository.listEvents());
  app.get("/api/admin/jobs", async () => repository.listJobs());
  app.get("/api/admin/tracks", async () => repository.listTracks());
  app.get("/api/admin/actors", async () => repository.listActors());
  app.get("/api/admin/resources", async () => repository.listResources());
  app.get("/api/admin/view", async () => repository.getDefaultView());
  app.get("/api/admin/scout", async (request) => {
    const query = z.object({ status: z.string().optional() }).parse(request.query);
    return repository.listScoutInsights(query.status);
  });
  app.get("/api/admin/evaluation", async () => latestEvaluation(db));

  app.patch("/api/admin/sources/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = SourcePatch.parse(request.body);
    await repository.updateSource(id, {
      ...(patch.authorityScore === undefined ? {} : { authority_score: patch.authorityScore }),
      ...(patch.tier === undefined ? {} : { tier: patch.tier }),
      ...(patch.config === undefined ? {} : { config_json: JSON.stringify(patch.config) }),
      ...(patch.priority === undefined ? {} : { priority: patch.priority }),
      ...(patch.timeoutMs === undefined ? {} : { timeout_ms: patch.timeoutMs }),
      ...(patch.maxRetries === undefined ? {} : { max_retries: patch.maxRetries }),
      ...(patch.baseBackoffMs === undefined ? {} : { base_backoff_ms: patch.baseBackoffMs }),
      ...(patch.rateLimitPerMinute === undefined
        ? {}
        : { rate_limit_per_minute: patch.rateLimitPerMinute }),
    });
    return { ok: true };
  });

  app.post("/api/admin/sources/:id/lifecycle", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = SourceAction.parse(request.body);
    const source = await repository.getSource(id);
    if (!source) return reply.code(404).send({ error: "Source not found" });
    if (action === "activate" && !source.last_success_at)
      return reply
        .code(409)
        .send({ error: "Source must pass a verification run before activation" });
    let next: string;
    try {
      next = transitionSource(source.lifecycle_status, action);
    } catch (error) {
      return reply
        .code(409)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
    await repository.updateSource(id, {
      lifecycle_status: next,
      enabled: next === "active" || next === "degraded" ? 1 : 0,
      retired_at: next === "retired" ? new Date().toISOString() : null,
      maintenance_status:
        next === "active"
          ? "ready"
          : next === "retired"
            ? "retired"
            : next === "shadow"
              ? "candidate"
              : source.maintenance_status,
    });
    const verification =
      action === "verify" || action === "restore"
        ? await collectSources(db, config, id)
        : undefined;
    return { ok: true, lifecycle: next, verification };
  });

  app.patch("/api/admin/events/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = EventPatch.parse(request.body);
    await repository.updateEvent(id, {
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.factSummary === undefined ? {} : { fact_summary: patch.factSummary }),
      ...(patch.summary === undefined ? {} : { summary: patch.summary }),
      ...(patch.technicalInsight === undefined
        ? {}
        : { technical_insight: patch.technicalInsight }),
      ...(patch.industryInsight === undefined ? {} : { industry_insight: patch.industryInsight }),
      ...(patch.futureOutlook === undefined ? {} : { future_outlook: patch.futureOutlook }),
      ...(patch.businessValue === undefined ? {} : { business_value: patch.businessValue }),
      ...(patch.category === undefined ? {} : { category: patch.category }),
      ...(patch.company === undefined ? {} : { company: patch.company }),
      ...(patch.keywords === undefined ? {} : { keywords_json: JSON.stringify(patch.keywords) }),
      ...(patch.confidenceScore === undefined
        ? {}
        : { confidence_score: patch.confidenceScore, manual_override: 1 }),
      ...(patch.heatScore === undefined ? {} : { heat_score: patch.heatScore, manual_override: 1 }),
      ...(patch.impactScore === undefined
        ? {}
        : { impact_score: patch.impactScore, manual_override: 1 }),
      ...(patch.status === undefined
        ? {}
        : {
            status: patch.status,
            published_at: patch.status === "published" ? new Date().toISOString() : null,
          }),
      ...(patch.featured === undefined ? {} : { featured: patch.featured ? 1 : 0 }),
    });
    return { ok: true };
  });

  app.patch("/api/admin/tracks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = TrackPatch.parse(request.body);
    await db
      .updateTable("tracks")
      .set({
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
        ...(patch.color === undefined ? {} : { color: patch.color }),
        ...(patch.icon === undefined ? {} : { icon: patch.icon }),
        ...(patch.orderIndex === undefined ? {} : { order_index: patch.orderIndex }),
        ...(patch.enabled === undefined ? {} : { enabled: patch.enabled ? 1 : 0 }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    return { ok: true };
  });

  app.patch("/api/admin/view/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ViewPatch.parse(request.body);
    await db
      .updateTable("views")
      .set({
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
        ...(patch.filters === undefined ? {} : { filters_json: JSON.stringify(patch.filters) }),
        ...(patch.layout === undefined ? {} : { layout_json: JSON.stringify(patch.layout) }),
        ...(patch.theme === undefined ? {} : { theme_json: JSON.stringify(patch.theme) }),
        ...(patch.status === undefined ? {} : { status: patch.status }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    return { ok: true };
  });

  app.patch("/api/admin/actors/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ActorPatch.parse(request.body);
    await db
      .updateTable("actors")
      .set({
        ...(patch.tableScore === undefined ? {} : { table_score: patch.tableScore }),
        ...(patch.scale === undefined ? {} : { scale: patch.scale }),
        ...(patch.domains === undefined ? {} : { domains_json: JSON.stringify(patch.domains) }),
        ...(patch.enabled === undefined ? {} : { enabled: patch.enabled ? 1 : 0 }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    return { ok: true };
  });

  app.patch("/api/admin/resources/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ResourcePatch.parse(request.body);
    await db
      .updateTable("model_resources")
      .set({
        ...(patch.planName === undefined ? {} : { plan_name: patch.planName }),
        ...(patch.riskLevel === undefined ? {} : { risk_level: patch.riskLevel }),
        ...(patch.enabled === undefined ? {} : { enabled: patch.enabled ? 1 : 0 }),
        ...(patch.verifiedAt === undefined ? {} : { verified_at: patch.verifiedAt }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    return { ok: true };
  });

  app.patch("/api/admin/scout/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = ScoutPatch.parse(request.body);
    const insight = await repository.getScoutInsight(id);
    if (!insight) return reply.code(404).send({ error: "Scout insight not found" });
    const allowed: Record<string, string[]> = {
      inbox: ["considering", "accepted", "dismissed", "archived"],
      considering: ["accepted", "dismissed", "archived"],
      accepted: ["published", "archived", "dismissed"],
      published: ["archived"],
      dismissed: ["inbox", "archived"],
      archived: ["inbox"],
    };
    if (!allowed[insight.status]?.includes(status))
      return reply
        .code(409)
        .send({ error: `Invalid scout transition: ${insight.status} -> ${status}` });
    await repository.updateScoutInsight(id, {
      status,
      published_at: status === "published" ? new Date().toISOString() : insight.published_at,
    });
    return { ok: true };
  });

  app.post("/api/admin/pipeline/collect", async (request) => {
    const body = z.object({ sourceId: z.string().uuid().optional() }).parse(request.body ?? {});
    return collectSources(db, config, body.sourceId);
  });
  app.post("/api/admin/pipeline/cluster", async () => clusterSignals(db));
  app.post("/api/admin/pipeline/scout", async (request) => {
    const body = z
      .object({ limit: z.number().int().min(1).max(10).optional() })
      .parse(request.body ?? {});
    return runScout(db, body.limit);
  });
  app.post("/api/admin/pipeline/evaluate", async () => evaluateSystem(db));
  app.post("/api/admin/pipeline/export", async () => exportStaticSite(db, config));

  await app.register(fastifyStatic, { root: config.distDir, prefix: "/" });
  await app.register(fastifyStatic, {
    root: join(config.rootDir, "web/admin"),
    prefix: "/admin/",
    decorateReply: false,
  });
  return app;
}

function bearerToken(request: FastifyRequest): string | undefined {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : undefined;
}
