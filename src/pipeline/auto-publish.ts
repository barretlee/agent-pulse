/** Autonomous publication behind deterministic evidence and readiness gates. */

import type { Kysely } from "kysely";
import { now } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";
import { findEventMergeCandidates } from "./event-merge.js";
import { evaluateEventReadiness } from "./readiness.js";
import { scoutPublicationDecision } from "./scout.js";

export interface PublicationPreparationResult {
  ready: number;
  published: number;
  blocked: number;
  eventIds: string[];
  errors: string[];
}

export interface ScoutPreparationResult {
  recommended: number;
  published: number;
  archived: number;
  insightIds: string[];
  errors: string[];
}

export interface MergePreparationResult {
  groups: number;
  mergeableEvents: number;
  errors: string[];
}

export interface AutoLifecycleResult {
  degraded: number;
  quarantined: number;
  errors: string[];
}

export async function autoPublishReadyEvents(
  db: Kysely<DatabaseSchema>,
): Promise<PublicationPreparationResult> {
  const result: PublicationPreparationResult = {
    ready: 0,
    published: 0,
    blocked: 0,
    eventIds: [],
    errors: [],
  };
  const events = await db.selectFrom("events").selectAll().where("status", "=", "review").execute();
  for (const event of events) {
    try {
      const readiness = await evaluateEventReadiness(db, event.id);
      if (readiness.status === "ready") {
        result.ready += 1;
        result.eventIds.push(event.id);
        await db
          .updateTable("events")
          .set({ status: "published", published_at: now(), updated_at: now() })
          .where("id", "=", event.id)
          .where("status", "=", "review")
          .execute();
        result.published += 1;
      } else {
        result.blocked += 1;
      }
    } catch (error) {
      result.errors.push(`Event ${event.id}: ${message(error)}`);
    }
  }
  return result;
}

export async function autoAdvanceScout(
  db: Kysely<DatabaseSchema>,
): Promise<ScoutPreparationResult> {
  try {
    const insights = await db
      .selectFrom("scout_insights")
      .select(["id", "total_score", "evidence_score", "confidence_score", "novelty_score"])
      .where("status", "in", ["inbox", "considering", "accepted"])
      .orderBy("total_score", "desc")
      .execute();
    const linkedPublished = await db
      .selectFrom("scout_evidence")
      .innerJoin("events", "events.id", "scout_evidence.event_id")
      .select("scout_evidence.insight_id as insightId")
      .where("events.status", "=", "published")
      .execute();
    const linkedIds = new Set(linkedPublished.map((item) => item.insightId));
    let published = 0;
    let archived = 0;
    const timestamp = now();
    for (const insight of insights) {
      const decision = scoutPublicationDecision(insight);
      const next = decision.allowed && linkedIds.has(insight.id) ? "published" : "archived";
      await db
        .updateTable("scout_insights")
        .set({
          status: next,
          published_at: next === "published" ? timestamp : null,
          updated_at: timestamp,
        })
        .where("id", "=", insight.id)
        .execute();
      if (next === "published") published += 1;
      else archived += 1;
    }
    return {
      recommended: published,
      published,
      archived,
      insightIds: insights
        .filter((item) => scoutPublicationDecision(item).allowed && linkedIds.has(item.id))
        .map((item) => item.id),
      errors: [],
    };
  } catch (error) {
    return {
      recommended: 0,
      published: 0,
      archived: 0,
      insightIds: [],
      errors: [message(error)],
    };
  }
}

export async function autoMergeEvents(db: Kysely<DatabaseSchema>): Promise<MergePreparationResult> {
  try {
    const candidates = (await findEventMergeCandidates(db)).filter(
      (candidate) => candidate.confidence >= 80,
    );
    return {
      groups: candidates.length,
      mergeableEvents: candidates.reduce(
        (count, group) =>
          count +
          group.events.filter(
            (event) => event.id !== group.targetEventId && event.status !== "published",
          ).length,
        0,
      ),
      errors: [],
    };
  } catch (error) {
    return { groups: 0, mergeableEvents: 0, errors: [message(error)] };
  }
}

export async function autoManageLifecycle(
  db: Kysely<DatabaseSchema>,
): Promise<AutoLifecycleResult> {
  const result: AutoLifecycleResult = { degraded: 0, quarantined: 0, errors: [] };
  const sources = await db.selectFrom("sources").selectAll().execute();
  for (const source of sources) {
    try {
      if (source.consecutive_failures >= 5 && source.lifecycle_status === "degraded") {
        await db
          .updateTable("sources")
          .set({
            lifecycle_status: "quarantined",
            enabled: 0,
            observation_enabled: 0,
            updated_at: now(),
          })
          .where("id", "=", source.id)
          .execute();
        result.quarantined += 1;
      } else if (source.consecutive_failures >= 2 && source.lifecycle_status === "active") {
        await db
          .updateTable("sources")
          .set({ lifecycle_status: "degraded", enabled: 1, updated_at: now() })
          .where("id", "=", source.id)
          .execute();
        result.degraded += 1;
      }
    } catch (error) {
      result.errors.push(`${source.slug}: ${message(error)}`);
    }
  }
  return result;
}

export async function runAutoPipeline(db: Kysely<DatabaseSchema>) {
  const [events, scout, merges, lifecycle] = await Promise.all([
    autoPublishReadyEvents(db),
    autoAdvanceScout(db),
    autoMergeEvents(db),
    autoManageLifecycle(db),
  ]);
  return { events, scout, merges, lifecycle, mode: "autonomous-publish-and-govern" };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
