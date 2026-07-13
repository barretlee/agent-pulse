import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { earlyHistoryEvents } from "../src/catalog/early-history.js";
import { historicalEvents } from "../src/catalog/history.js";
import { recentDensityEvents } from "../src/catalog/recent-density.js";
import { sourceCatalog } from "../src/catalog/sources.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { exportStaticSite } from "../src/pipeline/export.js";
import { buildApp } from "../src/server/app.js";

const databases: ReturnType<typeof createDatabase>[] = [];
afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("SQLite application", () => {
  it("reuses an already collected canonical paper signal when seeding a curated event", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const slug = "predicatelongbench-long-context-difficulty";
    const curated = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirstOrThrow();
    const evidence = await db
      .selectFrom("event_signals")
      .select("signal_id")
      .where("event_id", "=", curated.id)
      .executeTakeFirstOrThrow();
    await db.deleteFrom("events").where("id", "=", curated.id).execute();
    await db
      .updateTable("signals")
      .set({ external_id: null })
      .where("id", "=", evidence.signal_id)
      .execute();

    await expect(seedDatabase(db)).resolves.toBeUndefined();

    const restored = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirstOrThrow();
    await expect(
      db
        .selectFrom("event_signals")
        .select("signal_id")
        .where("event_id", "=", restored.id)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ signal_id: evidence.signal_id });
  });

  it("migrates, seeds and exports a privacy-safe static site", async () => {
    const base = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const temp = await mkdtemp(join(tmpdir(), "agent-pulse-"));
    const config = { ...base, distDir: join(temp, "dist") };
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);

    const repository = new Repository(db);
    const sourceBySlug = await repository.getSourceByIdOrSlug(sourceCatalog[0]?.slug ?? "missing");
    expect(sourceBySlug?.slug).toBe(sourceCatalog[0]?.slug);
    expect((await repository.getSourceByIdOrSlug(sourceBySlug?.id ?? "missing"))?.id).toBe(
      sourceBySlug?.id,
    );
    const publishedEvents = await repository.publicEvents();
    expect(publishedEvents.length).toBeGreaterThanOrEqual(20);
    for (const month of ["2026-04", "2026-05", "2026-06"]) {
      expect(
        publishedEvents.filter((event) => event.happenedAt.startsWith(month)).length,
        month,
      ).toBeGreaterThanOrEqual(6);
    }
    await db
      .updateTable("signals")
      .set({ title: "DeepSeek-V3 开源：训练效率成为中国追赶的新叙事" })
      .where("external_id", "=", "deepseek-v3-efficient-frontier")
      .execute();
    await seedDatabase(db);
    expect(
      await db
        .selectFrom("signals")
        .select("title")
        .where("external_id", "=", "deepseek-v3-efficient-frontier")
        .executeTakeFirstOrThrow(),
    ).toEqual({ title: "DeepSeek-V3 开源：训练效率成为全球模型竞争的新变量" });
    const result = await exportStaticSite(db, config);
    expect(result).toMatchObject({
      events: earlyHistoryEvents.length + historicalEvents.length + recentDensityEvents.length + 6,
      tracks: 10,
      sources: sourceCatalog.length,
      version: "0.8.1",
    });
    const timeline = await readFile(join(config.distDir, "data/timeline.json"), "utf8");
    expect(timeline).not.toContain("ADMIN_TOKEN");
    expect(timeline).not.toContain("/Users/");
    expect(JSON.parse(timeline).events[0]).not.toHaveProperty("manual_override");
    const scout = JSON.parse(await readFile(join(config.distDir, "data/scout.json"), "utf8"));
    expect(scout.insights).toHaveLength(1);
    expect(scout.insights[0]).not.toHaveProperty("cooldown_key");
    expect(scout.insights[0].evidence[0].slug).toBe("lingbot-vla-2-cross-embodiment");
    const product = JSON.parse(await readFile(join(config.distDir, "data/product.json"), "utf8"));
    expect(product.roadmap).toHaveLength(5);
    expect(product.releases[0]).toMatchObject({ version: "0.8.1" });
    expect(product.sourceCoverage.total).toBeGreaterThanOrEqual(100);
    expect(product.sourceCoverage.observing).toBe(0);
    expect(product.evaluation).toMatchObject({
      rawWeightedScore: expect.any(Number),
      evidenceCoverage: expect.any(Number),
    });
    expect(product.evaluation.dimensions).toHaveLength(10);
    expect(product.evaluation.status).toBe("partial");
    expect(product.evaluation.overallScore).toBeLessThan(50);
    expect(
      product.evaluation.dimensions.every(
        (item: { sampleTarget: number }) => item.sampleTarget > 0,
      ),
    ).toBe(true);
    expect(
      product.evaluation.dimensions
        .filter((item: { status: string }) => item.status === "insufficient_data")
        .every(
          (item: { score: number; scoreCap: number }) =>
            item.score <= 45 && item.score <= item.scoreCap,
        ),
    ).toBe(true);
    const publicSources = JSON.parse(
      await readFile(join(config.distDir, "data/sources.json"), "utf8"),
    );
    expect(publicSources[0]).toMatchObject({
      healthStatus: "unchecked",
      lastCheckedAt: null,
      latestItemAt: null,
    });
    expect(publicSources[0]).not.toHaveProperty("sample_json");
    expect(publicSources[0]).not.toHaveProperty("error_summary");
    const publicInfluencers = JSON.parse(
      await readFile(join(config.distDir, "data/influencers.json"), "utf8"),
    );
    expect(publicInfluencers.length).toBeGreaterThanOrEqual(10);
    expect(publicInfluencers.find((item: { slug: string }) => item.slug === "baoyu")).toMatchObject(
      {
        feedSourceSlug: "baoyu",
      },
    );
    const staticPages = [
      ["index.html", "今日 AI 行业判断 · Agent Pulse"],
      ["lines/index.html", "趋势判断 · Agent Pulse"],
      ["lines/tech-evolution/index.html", "模型能力与研究 · Agent Pulse"],
      ["timeline/index.html", "事件脉络 · Agent Pulse"],
      ["scout/index.html", "行动参考 · Agent Pulse"],
      ["actors/index.html", "关键参与者 · Agent Pulse"],
      ["resources/index.html", "选型与成本 · Agent Pulse"],
      ["product/index.html", "判断方法 · Agent Pulse"],
      ["changelog/index.html", "Changelog · Agent Pulse"],
      ["sources/index.html", "覆盖与来源 · Agent Pulse"],
      ["legal/index.html", "版权与纠错 · Agent Pulse"],
      ["404.html", "页面未找到 · Agent Pulse"],
    ] as const;
    for (const [path, title] of staticPages) {
      const html = await readFile(join(config.distDir, path), "utf8");
      expect(html, path).toContain(`<title>${title}</title>`);
      expect(html, path).toContain('rel="canonical"');
      expect(html, path).toContain("data-event-drawer");
      expect(html, path).not.toContain("__PREFIX__");
      expect(html, path).not.toContain("/Users/");
    }
    const englishActors = await readFile(join(config.distDir, "en/actors/index.html"), "utf8");
    expect(englishActors).toContain('href="../../assets/icons.svg#sun"');
    expect(englishActors).not.toContain('href="../assets/icons.svg#sun"');
    expect(englishActors).toContain('data-timeline-src="../../data/timeline.json"');
    const changelog = await readFile(join(config.distDir, "changelog/index.html"), "utf8");
    expect(changelog).toContain('id="v0-7-0"');
    expect(changelog).toContain("LATEST RELEASE");
    expect(changelog).toContain("The Autonomous Intelligence Loop");
    const englishChangelog = await readFile(
      join(config.distDir, "en/changelog/index.html"),
      "utf8",
    );
    expect(englishChangelog).toContain("LATEST RELEASE");
    const home = await readFile(join(config.distDir, "index.html"), "utf8");
    expect(home).toContain("GPT-5.6");
    expect(home).toContain("每天 10 分钟，看懂 AI 行业变化并形成判断");
    expect(home).toContain("30 秒");
    expect(home).toContain("3 分钟");
    expect(home).toContain("10 分钟");
    expect(home).toMatch(/<section class="home-intro shell">[\s\S]*<ol class="reading-journey"/);
    expect(home).toContain("本周值得读的技术论文");
    expect(home).toContain("PredicateLongBench");
    expect(home).toContain('class="github-star-button"');
    expect(home).toContain('data-event-link="gpt-5-6-agent-platform-shift"');
    expect(home.indexOf("今天最值得关注的变化")).toBeLessThan(
      home.indexOf("别追每条新闻。<em>看清变化的方向。</em>"),
    );
    expect(home).not.toContain(">六条主线<");
    expect(home).not.toContain(">证据时间轴<");
    expect(home).not.toContain(">决策工具<");
    const timelinePage = await readFile(join(config.distDir, "timeline/index.html"), "utf8");
    expect(timelinePage).toContain("追踪每条主线，从信号到完整脉络");
    expect(timelinePage).toContain("最近进展");
    expect(timelinePage).toContain('id="event-drawer"');
    expect(timelinePage).toContain('aria-haspopup="dialog"');
    expect(timelinePage).toContain('data-timeline-year="2026"');
    expect(timelinePage).toContain('data-timeline-year="2022"');
    expect(timelinePage).toContain('data-event="chatgpt-research-preview"');
    expect(timelinePage).toContain('data-filter-track="official"');
    expect(timelinePage).toContain('data-filter-track="research"');
    expect(timelinePage).toContain('data-research="true"');
    expect(timelinePage).not.toMatch(/data-category="(?:research|paper)" data-research="false"/);
    expect(timelinePage).toContain('data-research-day="2026-07-09"');
    expect(timelinePage).toContain("当天收录 6 篇研究");
    expect(timelinePage).not.toContain("近三月密度");
    expect(timelinePage).not.toContain("论文批次状态");
    expect(timelinePage).toContain('data-recent="true"');
    for (const slug of [
      "predicatelongbench-long-context-difficulty",
      "compete-then-collaborate-multi-agent",
      "autopersonas-agent-simulation-diversity",
      "blind-spots-bench-vision-language",
      "overthinking-secret-leakage-reasoning-models",
      "causalds-causal-data-science-agents",
    ]) {
      expect(timelinePage).toContain(`data-event="${slug}"`);
    }
    const linesPage = await readFile(join(config.distDir, "lines/index.html"), "utf8");
    const overviewNav = linesPage.match(
      /<nav class="line-nav line-nav-overview"[\s\S]*?<\/nav>/,
    )?.[0];
    expect(overviewNav).toBeDefined();
    expect(overviewNav?.match(/<a /g)).toHaveLength(6);
    expect(linesPage).not.toContain("选择一条主线开始");
    expect(linesPage).toContain("从 ChatGPT 时刻到 Agent 时代");
    expect(linesPage).toContain("查看趋势详情");
    expect(linesPage).toContain("已收购");
    expect(linesPage).toContain("已停止");
    expect(linesPage).not.toContain("中国追赶");
    const sourcesPage = await readFile(join(config.distDir, "sources/index.html"), "utf8");
    expect(sourcesPage).toContain("值得持续跟踪的 AI 核心个人");
    expect(sourcesPage).toContain("宝玉");
    expect(sourcesPage).toContain("平台受限");
    expect(timelinePage).toContain("inert");
    expect(timelinePage).not.toContain("data-event-panel");
    expect(sourcesPage).toContain("我们持续看到了什么，又漏掉了什么");
    for (const domain of ["Claude Code", "OpenAI / Codex", "Lovable", "MCP", "A2A"]) {
      expect(sourcesPage).toContain(domain);
    }
    const eventSlug = JSON.parse(timeline).events[0].slug as string;
    const eventPage = await readFile(
      join(config.distDir, "events", eventSlug, "index.html"),
      "utf8",
    );
    expect(eventPage).toContain("发生了什么");
    expect(eventPage).toContain("事情是如何发展到今天的");
    expect(eventPage).toContain("当前判断");
    expect(eventPage).toContain("原始证据");
    const researchEventPage = await readFile(
      join(config.distDir, "events", "predicatelongbench-long-context-difficulty", "index.html"),
      "utf8",
    );
    expect(researchEventPage).toContain("研究预印本：方法和结果尚待独立复现");
    expect(researchEventPage).toContain("核心贡献不是再增加一个平均分");
    const github = JSON.parse(await readFile(join(config.distDir, "data/github.json"), "utf8"));
    expect(github).toMatchObject({
      repositoryUrl: "https://github.com/barretlee/agent-pulse",
      stars: null,
      latestRelease: "v0.8.1",
    });
  });

  it("protects production admin APIs", async () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "sqlite::memory:",
      ADMIN_TOKEN: "a-secure-token-for-tests",
    });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    await exportStaticSite(db, config);
    const app = await buildApp(db, config);
    const unauthorized = await app.inject({ method: "GET", url: "/api/admin/dashboard" });
    expect(unauthorized.statusCode).toBe(401);
    const authorized = await app.inject({
      method: "GET",
      url: "/api/admin/dashboard",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(authorized.statusCode).toBe(200);
    const evaluation = await app.inject({
      method: "POST",
      url: "/api/admin/pipeline/evaluate",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(evaluation.statusCode).toBe(200);
    expect(evaluation.json().dimensions).toHaveLength(10);
    const funnel = await app.inject({
      method: "GET",
      url: "/api/admin/pipeline/funnel",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(funnel.statusCode).toBe(200);
    expect(funnel.json()).toMatchObject({
      signals: { backlog: expect.any(Number), deferred: expect.any(Number) },
      events: { ready: expect.any(Number), blocked: expect.any(Number) },
    });
    const sources = await app.inject({
      method: "GET",
      url: "/api/admin/sources",
      headers: { authorization: "Bearer a-secure-token-for-tests" },
    });
    expect(sources.statusCode).toBe(200);
    expect(sources.json()[0]).toMatchObject({
      operations: {
        activate: { allowed: expect.any(Boolean), healthyChecks: expect.any(Number) },
        collect: { allowed: expect.any(Boolean) },
        observe: { allowed: expect.any(Boolean) },
        quarantine: { allowed: expect.any(Boolean) },
      },
    });
    for (const url of [
      "/api/admin/source-checks",
      "/api/admin/event-readiness",
      "/api/admin/event-merge-candidates",
    ]) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: "Bearer a-secure-token-for-tests" },
      });
      expect(response.statusCode, url).toBe(200);
    }
    const shadowSource = (await new Repository(db).listSources()).find(
      (source) => source.lifecycle_status === "shadow" && source.acquisition === "rss",
    );
    const prematureObservation = await app.inject({
      method: "POST",
      url: `/api/admin/sources/${shadowSource?.id}/observation`,
      headers: { authorization: "Bearer a-secure-token-for-tests" },
      payload: { enabled: true },
    });
    expect(prematureObservation.statusCode).toBe(409);
    expect(prematureObservation.json().error).toContain("not eligible");
    await app.close();
  });

  it("refreshes catalog metadata without resetting source runtime state", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const repository = new Repository(db);
    const source = (await repository.listSources()).find((item) => item.slug === "openai");
    expect(source).toBeTruthy();
    await repository.updateSource(source?.id ?? "missing", {
      lifecycle_status: "degraded",
      enabled: 1,
      health_score: 42,
      consecutive_failures: 3,
      state_json: JSON.stringify({ etag: "runtime-state" }),
      last_success_at: "2026-07-12T00:00:00.000Z",
      last_error: "transient",
    });

    await seedDatabase(db);

    const preserved = await repository.getSource(source?.id ?? "missing");
    expect(preserved).toMatchObject({
      lifecycle_status: "degraded",
      enabled: 1,
      health_score: 42,
      consecutive_failures: 3,
      last_success_at: "2026-07-12T00:00:00.000Z",
      last_error: "transient",
    });
    expect(JSON.parse(preserved?.state_json ?? "{}")).toEqual({ etag: "runtime-state" });
  });
});
