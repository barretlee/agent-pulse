export type SourceLifecycle =
  | "draft"
  | "shadow"
  | "active"
  | "degraded"
  | "quarantined"
  | "retired";

export interface SourceHealth {
  lifecycle: SourceLifecycle;
  healthScore: number;
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
}

export function applySourceSuccess(state: SourceHealth, notModified = false): SourceHealth {
  if (state.lifecycle === "retired" || state.lifecycle === "quarantined") {
    return {
      ...state,
      healthScore: Math.min(100, state.healthScore + (notModified ? 3 : 8)),
      consecutiveFailures: 0,
      successCount: state.successCount + 1,
    };
  }
  return {
    ...state,
    healthScore: Math.min(100, state.healthScore + (notModified ? 3 : 8)),
    consecutiveFailures: 0,
    successCount: state.successCount + 1,
  };
}

export function applySourceFailure(state: SourceHealth, severe = false): SourceHealth {
  if (state.lifecycle === "retired") return state;
  const consecutiveFailures = state.consecutiveFailures + 1;
  const lifecycle: SourceLifecycle = severe
    ? "quarantined"
    : consecutiveFailures >= 5
      ? "quarantined"
      : consecutiveFailures >= 2
        ? "degraded"
        : state.lifecycle;
  return {
    ...state,
    lifecycle,
    healthScore: Math.max(0, state.healthScore - (severe ? 25 : 15)),
    consecutiveFailures,
    failureCount: state.failureCount + 1,
  };
}

export function canRunScheduled(lifecycle: string): boolean {
  return lifecycle === "active" || lifecycle === "degraded";
}

export function transitionSource(current: string, action: string): SourceLifecycle {
  const allowed: Record<string, Partial<Record<string, SourceLifecycle>>> = {
    draft: { verify: "shadow", retire: "retired" },
    shadow: { activate: "active", quarantine: "quarantined", retire: "retired" },
    active: { degrade: "degraded", quarantine: "quarantined", retire: "retired" },
    degraded: { activate: "active", quarantine: "quarantined", retire: "retired" },
    quarantined: { restore: "shadow", retire: "retired" },
    retired: { restore: "shadow" },
  };
  const next = allowed[current]?.[action];
  if (!next) throw new Error(`Invalid source transition: ${current} -> ${action}`);
  return next;
}
