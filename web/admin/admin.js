const state = {
  token: sessionStorage.getItem("agent-pulse-admin-token") || "",
  lastAutoActions: null,
  sources: [],
  events: [],
  tracks: [],
  actors: [],
  resources: [],
  view: null,
  scout: [],
  sourceRuns: [],
  discoveries: [],
  discoverySummary: {},
  discoveryStatus: "all",
  evaluation: null,
  monitor: null,
  sourceChecks: [],
  funnel: null,
  mergeCandidates: [],
};
const $ = (selector) => document.querySelector(selector);
const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};
const titles = {
  dashboard: "运行概览",
  sources: "来源管理",
  discoveries: "来源发现",
  scout: "行动建议",
  health: "系统健康",
  evaluation: "评测中心",
  events: "事件与发布",
  tracks: "趋势管理",
  actors: "角色管理",
  resources: "模型资源",
  view: "页面设置",
};
$("#tokenInput").value = state.token;

async function _runAutoPipeline() {
  const indicator = $("#autoPipelineIndicator");
  const output = $("#pipelineOutput");
  const status = $("#pipelineStatus");
  status.textContent = "AUTO";
  if (indicator) indicator.hidden = false;
  try {
    const [events, scout, merges, lifecycle] = await Promise.all([
      api("/api/admin/pipeline/auto-publish", { method: "POST", body: "{}" }),
      api("/api/admin/pipeline/auto-advance-scout", { method: "POST", body: "{}" }),
      api("/api/admin/pipeline/auto-merge", { method: "POST", body: "{}" }),
      api("/api/admin/pipeline/auto-lifecycle", { method: "POST", body: "{}" }),
    ]);
    state.lastAutoActions = { events, scout, merges, lifecycle, at: new Date().toISOString() };
    status.textContent = "DONE";
    renderLastAutoActions();
    output.textContent = JSON.stringify(state.lastAutoActions, null, 2);
    await loadAll();
  } catch (error) {
    status.textContent = "FAILED";
    output.textContent = error.message;
  }
}

function renderLastAutoActions() {
  const root = $("#lastAutoActions");
  if (!root || !state.lastAutoActions) return;
  root.hidden = false;
  const { events, scout, merges, lifecycle, at } = state.lastAutoActions;
  root.replaceChildren(
    node("strong", "", `上次自动执行 · ${new Date(at).toLocaleString("zh-CN")}`),
    autoActionRow("发布就绪候选", events.ready, events.errors.length),
    autoActionRow("星探建议候选", scout.recommended, scout.errors.length),
    autoActionRow("事件合并候选", merges.mergeableEvents, merges.errors.length),
    autoActionRow(
      "生命周期管理",
      lifecycle.degraded + lifecycle.quarantined,
      lifecycle.errors.length,
    ),
  );
}

function autoActionRow(label, ok, err) {
  const row = node("div", "auto-action-row");
  row.append(
    document.createTextNode(`${label}：`),
    err > 0 ? node("span", "stat", `${ok} / ${err} errors`) : node("span", "stat", `${ok}`),
  );
  return row;
}

async function api(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}
async function loadAll() {
  try {
    const [
      dashboard,
      sources,
      sourceRuns,
      discoveryPayload,
      scout,
      evaluation,
      events,
      jobs,
      tracks,
      actors,
      resources,
      view,
      funnel,
      mergeCandidates,
    ] = await Promise.all([
      api("/api/admin/dashboard"),
      api("/api/admin/sources"),
      api("/api/admin/source-runs"),
      api("/api/admin/source-discoveries?limit=300"),
      api("/api/admin/scout"),
      api("/api/admin/evaluation"),
      api("/api/admin/events"),
      api("/api/admin/jobs"),
      api("/api/admin/tracks"),
      api("/api/admin/actors"),
      api("/api/admin/resources"),
      api("/api/admin/view"),
      api("/api/admin/pipeline/funnel"),
      api("/api/admin/event-merge-candidates"),
    ]);
    Object.assign(state, {
      sources,
      sourceRuns,
      discoveries: discoveryPayload.items || [],
      discoverySummary: discoveryPayload.summary || {},
      scout,
      evaluation,
      events,
      tracks,
      actors,
      resources,
      view,
      funnel,
      mergeCandidates,
    });
    renderMetrics(dashboard);
    renderFunnel(funnel);
    renderJobs(jobs);
    renderSources();
    renderDiscoveries();
    renderScout();
    renderEvaluation();
    renderEvents();
    renderMergeCandidates();
    renderTracks();
    renderActors();
    renderResources();
    renderView();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderMergeCandidates() {
  const root = $("#mergeCandidateList");
  const count = $("#mergeCandidateCount");
  if (!root || !count) return;
  const groups = state.mergeCandidates || [];
  count.textContent = `${groups.length} GROUP · 自动审计`;
  root.replaceChildren();
  groups.slice(0, 20).forEach((group) => {
    const card = node("article", "merge-candidate");
    const header = node("div", "merge-candidate-head");
    header.append(
      node("strong", "", `${group.events.length} 个疑似重复事件`),
      node("span", "", `${group.confidence}% · ${group.reason}`),
    );
    card.append(header);
    group.events.forEach((event) => {
      const row = node(
        "div",
        event.id === group.targetEventId ? "merge-event target" : "merge-event",
      );
      row.append(
        node("span", "", event.id === group.targetEventId ? "建议主事件" : "候选分支"),
        node("strong", "", event.title),
        node(
          "small",
          "",
          `${event.status} · ${event.independentSources} 来源 · ${event.evidenceCount} 证据`,
        ),
      );
      card.append(row);
    });
    root.append(card);
  });
  if (!groups.length) root.append(node("p", "cell-muted", "未发现高置信事件合并候选。"));
}

function renderFunnel(report) {
  state.funnel = report;
  const flow = $("#funnelFlow");
  const blockers = $("#funnelBlockers");
  if (!flow || !blockers) return;
  const steps = [
    ["原始信号", report.signals.total, `${report.signals.primary} 条一手归属`],
    [
      "已聚类",
      report.signals.clustered,
      `${report.signals.backlog} 条待处理 · ${report.signals.deferred} 条延后`,
    ],
    ["事件", report.events.total, `${report.events.multiSource} 个多源事件`],
    ["内容就绪", report.events.ready, `${report.events.blocked} 个未通过发布检查`],
    ["已发布", report.events.published, `事件发布率 ${report.conversion.eventToPublishedPercent}%`],
  ];
  flow.replaceChildren();
  steps.forEach(([label, value, note], index) => {
    const card = node("div", "funnel-step");
    card.append(
      node("small", "", label),
      node("strong", "", String(value)),
      node("span", "", note),
    );
    flow.append(card);
    if (index < steps.length - 1) flow.append(node("i", "funnel-arrow", "→"));
  });
  const blockerLabels = {
    placeholder_content: "占位内容",
    thin_fact: "事实过薄",
    generic_entity: "实体泛化",
    missing_category: "缺分类",
    missing_keywords: "缺关键词",
    missing_track: "缺主线",
    missing_evidence: "缺证据",
    missing_primary_evidence: "缺官方原始资料",
    low_confidence: "低置信",
    unsupported_heat: "热度证据不足",
    thin_research_analysis: "研究分析过短",
  };
  blockers.replaceChildren();
  Object.entries(report.blockerCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .forEach(([key, value]) => {
      const item = node("span", "funnel-blocker");
      item.append(
        node("b", "", String(value)),
        document.createTextNode(` ${blockerLabels[key] || key}`),
      );
      blockers.append(item);
    });
  if (report.signals.aggregatorDebt > 0) {
    blockers.append(
      node(
        "span",
        "funnel-blocker",
        `${report.signals.aggregatorDebt} 条未挂载聚合信号由定时任务自动清理`,
      ),
    );
  }
  const freshness = $("#funnelFreshness");
  freshness.textContent = `MULTI-SOURCE ${report.conversion.multiSourcePercent}%`;
}

function renderEvaluation() {
  const root = $("#evaluationGrid");
  const capabilityRoot = $("#capabilityMap");
  root.replaceChildren();
  capabilityRoot.replaceChildren();
  if (!state.evaluation) {
    $("#evaluationScore").textContent = "—";
    $("#evaluationStatus").textContent = "点击流水线中的评测开始";
    $("#evaluationCalibration").textContent = "尚未评测";
    return;
  }
  $("#evaluationScore").textContent = state.evaluation.overallScore;
  $("#evaluationStatus").textContent =
    `${state.evaluation.status} · v${state.evaluation.releaseVersion}`;
  $("#evaluationCalibration").textContent =
    `维度加权 ${state.evaluation.rawWeightedScore ?? "—"} · 充分证据覆盖 ${state.evaluation.evidenceCoverage ?? 0}% · ${state.evaluation.notes ?? "已应用低样本惩罚"}`;
  state.evaluation.dimensions.forEach((dimension) => {
    const card = node("article", `evaluation-card ${dimension.status}`);
    const top = node("div", "evaluation-card-top");
    const score = node("div", "evaluation-card-score");
    score.append(node("b", "", String(dimension.score)));
    if (Number.isFinite(dimension.rawScore) && dimension.rawScore !== dimension.score) {
      score.append(node("del", "", String(dimension.rawScore)));
    }
    top.append(node("strong", "", dimension.name), score);
    const bar = node("div", "evaluation-bar");
    const fill = node("i");
    fill.style.width = `${dimension.score}%`;
    bar.append(fill);
    card.append(
      top,
      bar,
      node(
        "span",
        "",
        dimension.status === "measured"
          ? `样本 ${dimension.sampleSize}/${dimension.sampleTarget ?? "—"}`
          : `证据不足 · 样本 ${dimension.sampleSize}/${dimension.sampleTarget ?? "—"} · 上限 ${dimension.scoreCap ?? 45}`,
      ),
      node("p", "", dimension.summary),
    );
    if (dimension.penalties?.length) {
      const penalties = node("ul", "evaluation-penalties");
      dimension.penalties.forEach((penalty) => {
        penalties.append(node("li", "", penalty));
      });
      card.append(penalties);
    }
    card.append(node("small", "", `下一步：${dimension.nextAction}`));
    root.append(card);
  });
  const domains = state.evaluation.capabilities.reduce((groups, capability) => {
    if (!groups[capability.domain]) groups[capability.domain] = [];
    groups[capability.domain].push(capability);
    return groups;
  }, {});
  Object.entries(domains).forEach(([domain, items]) => {
    const group = node("section", "capability-group");
    group.append(node("h3", "", domain.toUpperCase()));
    items.forEach((capability) => {
      const item = node("div", `capability-item ${capability.status}`);
      item.append(
        node("strong", "", capability.name),
        node("span", "", `${capability.maturity} · ${capability.status}`),
        node("small", "", capability.evidence),
      );
      group.append(item);
    });
    capabilityRoot.append(group);
  });
}
function renderMetrics(data) {
  const labels = {
    sources: "来源",
    signals: "信号",
    drafts: "隔离队列",
    published: "已发布",
    failedJobs: "失败任务",
    degradedSources: "异常信源",
    scoutInbox: "行动建议处理中",
  };
  const grid = $("#metricGrid");
  grid.replaceChildren();
  Object.entries(labels).forEach(([key, label]) => {
    const card = node("div", "metric-card");
    card.append(node("span", "", label), node("strong", "", data[key] ?? 0));
    grid.append(card);
  });
}
function renderJobs(jobs) {
  const list = $("#jobList");
  list.replaceChildren();
  jobs.slice(0, 10).forEach((job) => {
    const item = node("div", "job-item");
    item.append(
      node("strong", "", `${job.type} · ${job.status}`),
      node("span", "cell-muted", `${job.created_count}/${job.collected_count}`),
      node("small", "", new Date(job.started_at).toLocaleString("zh-CN")),
    );
    list.append(item);
  });
  if (!jobs.length) list.append(node("p", "cell-muted", "暂无任务记录"));
}
function renderSources(filter = "") {
  const root = $("#sourcesTable");
  root.replaceChildren();
  const advanced = node("button", "advanced-toggle", "⚙ 高级操作");
  const advancedSection = node("div", "advanced-section");
  advanced.addEventListener("click", () => advancedSection.classList.toggle("visible"));
  state.sources
    .filter((item) => includes(item, filter))
    .forEach((source) => {
      const row = node("div", "table-row");
      row.append(
        mainCell(
          source.name,
          `${source.slug} · ${source.source_category} · ${source.acquisition} · ${source.maintenance_status}`,
        ),
        node(
          "span",
          "cell-muted",
          `Tier ${source.tier} / ${source.role}\n${source.lifecycle_status}${source.observation_enabled === 1 ? " · OBSERVING" : ""}`,
        ),
      );
      const score = input("number", source.authority_score, "score-input");
      score.min = 0;
      score.max = 100;
      score.addEventListener("change", () =>
        patch(`/api/admin/sources/${source.id}`, { authorityScore: Number(score.value) }),
      );
      const latestRun = state.sourceRuns.find((run) => run.source_id === source.id);
      row.append(
        score,
        node(
          "span",
          "cell-muted",
          `健康 ${source.health_score}\n失败 ${source.consecutive_failures}\n${latestRun?.status || "未运行"}`,
        ),
      );
      const actions = node("div", "row-actions");
      sourceActions(source).forEach(([action, label]) => {
        const button = node("button", "row-action", label);
        const operation = sourceOperation(source, action);
        button.disabled = operation.allowed === false;
        if (operation.reason) button.title = sourceOperationReason(operation.reason, operation);
        button.addEventListener("click", () =>
          withBusy(button, () => sourceLifecycle(source.id, action)),
        );
        actions.append(button);
      });
      const run = node("button", "row-action", "单源拉取");
      const collectOperation = source.operations?.collect;
      run.disabled = collectOperation?.allowed === false;
      if (collectOperation?.reason) run.title = sourceOperationReason(collectOperation.reason);
      run.addEventListener("click", () => withBusy(run, () => runSource(source.id)));
      if (["shadow", "active", "degraded"].includes(source.lifecycle_status)) actions.append(run);
      if (source.lifecycle_status === "shadow") {
        const observe = node(
          "button",
          "row-action",
          source.observation_enabled === 1 ? "停止观察" : "开启观察",
        );
        const observeOperation = source.operations?.observe;
        observe.disabled = observeOperation?.allowed === false;
        if (observeOperation?.reason)
          observe.title = sourceOperationReason(observeOperation.reason);
        observe.addEventListener("click", () =>
          withBusy(observe, () => sourceObservation(source.id, source.observation_enabled !== 1)),
        );
        actions.append(observe);
      }
      row.append(actions);
      root.append(row);
    });
  if (state.sources.length) {
    root.append(advanced, advancedSection);
  }
}

function renderDiscoveries(filter = "") {
  const root = $("#discoveriesTable");
  const empty = $("#discoveryEmpty");
  root.replaceChildren();
  renderDiscoveryMetrics();
  const items = state.discoveries.filter(
    (item) =>
      (state.discoveryStatus === "all" || item.status === state.discoveryStatus) &&
      includes(item, filter),
  );
  items.forEach((item) => {
    const row = node("article", "discovery-row");
    const aggregator = node("div", "discovery-source");
    aggregator.append(
      node("span", "discovery-orbit", "DISCOVERY"),
      node(
        "strong",
        "",
        item.aggregator?.name || item.aggregator_name || item.aggregatorName || "未知聚合器",
      ),
      node(
        "small",
        "",
        item.aggregator?.slug || item.aggregator_slug || item.aggregatorSlug || "aggregator",
      ),
    );

    const origin = node("div", "discovery-origin");
    const originUrl = item.origin_url || item.originUrl || item.discovery_url || item.discoveryUrl;
    const handles = displayHandles(
      item.handles || parseList(item.handles_json || item.handlesJson),
    );
    const identity =
      item.rawDomainOrHandle ||
      item.origin_name ||
      item.originName ||
      handles[0] ||
      safeHostname(originUrl) ||
      "待解析来源";
    origin.append(
      node("strong", "", identity),
      node(
        "small",
        "",
        [item.origin_kind || item.originKind, safeHostname(originUrl), ...handles]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    const clueLink = externalLink(originUrl, "查看发现线索 ↗");
    if (clueLink) origin.append(clueLink);

    const matched = node("div", "discovery-match");
    if (item.matchedPrimarySource || item.matched_source_name || item.matchedSourceName) {
      matched.append(
        node(
          "strong",
          "",
          item.matchedPrimarySource?.name || item.matched_source_name || item.matchedSourceName,
        ),
        node(
          "small",
          "",
          item.matchedPrimarySource?.slug ||
            item.matched_source_slug ||
            item.matchedSourceSlug ||
            "已对齐注册源",
        ),
      );
    } else {
      matched.append(node("strong", "", "—"), node("small", "", "尚未匹配一手源"));
    }

    const status = item.status || "pending";
    row.append(
      aggregator,
      origin,
      matched,
      node("span", `discovery-status ${status}`, discoveryStatusLabel(status)),
      node(
        "time",
        "discovery-time",
        formatDateTime(item.lastDiscoveredAt || item.last_seen_at || item.lastSeenAt),
      ),
    );
    root.append(row);
  });
  empty.hidden = items.length > 0;
}

function renderDiscoveryMetrics() {
  const root = $("#discoveryMetrics");
  root.replaceChildren();
  const summary = normalizeDiscoverySummary(state.discoverySummary, state.discoveries);
  [
    ["total", "发现候选"],
    ["pending", "待判定"],
    ["candidate", "候选验证中"],
    ["matched_source", "已匹配一手源"],
    ["merged_signal", "已并入信号"],
    ["insufficient_identity", "身份信息不足"],
  ].forEach(([key, label]) => {
    const card = node("div", `discovery-metric ${key}`);
    card.append(node("strong", "", String(summary[key] || 0)), node("span", "", label));
    root.append(card);
  });
}

function normalizeDiscoverySummary(summary, items) {
  const byStatus = summary.byStatus || summary.by_status || summary;
  const count = (status) => items.filter((item) => item.status === status).length;
  return {
    total: Number(summary.total ?? items.length),
    pending: Number(byStatus.pending ?? count("pending")),
    candidate: Number(byStatus.candidate ?? count("candidate")),
    matched_source: Number(byStatus.matched_source ?? count("matched_source")),
    merged_signal: Number(byStatus.merged_signal ?? count("merged_signal")),
    insufficient_identity: Number(byStatus.insufficient_identity ?? count("insufficient_identity")),
  };
}

function discoveryStatusLabel(status) {
  return (
    {
      pending: "待判定",
      candidate: "候选验证中",
      matched_source: "已匹配一手源",
      merged_signal: "已并入信号",
      insufficient_identity: "身份信息不足",
    }[status] || status
  );
}

function parseList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).flat().filter(Boolean);
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (parsed && typeof parsed === "object") return Object.values(parsed).flat().filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

function displayHandles(handles) {
  return handles.map((item) => (typeof item === "string" ? item : item?.handle)).filter(Boolean);
}

function safeHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function externalLink(value, label) {
  let url;
  try {
    url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const link = node("a", "discovery-link", label);
  link.href = url.toString();
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function formatDateTime(value) {
  if (!value) return "尚无记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

function sourceActions(source) {
  return (
    {
      draft: [["verify", "验证"]],
      shadow: [
        ["activate", "启用"],
        ["quarantine", "隔离"],
      ],
      active: [
        ["degrade", "降级"],
        ["quarantine", "隔离"],
        ["retire", "退役"],
      ],
      degraded: [
        ["activate", "恢复"],
        ["quarantine", "隔离"],
        ["retire", "退役"],
      ],
      quarantined: [
        ["restore", "复验"],
        ["retire", "退役"],
      ],
      retired: [["restore", "重新安装"]],
    }[source.lifecycle_status] || []
  );
}

function sourceOperation(source, action) {
  if (["activate", "activate_strict", "auto_activate"].includes(action)) {
    return source.operations?.activate || { allowed: true, reason: null };
  }
  if (action === "quarantine") {
    return source.operations?.quarantine || { allowed: true, reason: null };
  }
  return { allowed: true, reason: null };
}

function sourceOperationReason(reason, operation = {}) {
  const labels = {
    latest_check_not_healthy: "最近一次检查不健康，请先执行单源拉取或审计",
    healthy_checks_below_20: `健康检查不足 20 次（当前 ${operation.healthyChecks ?? 0} 次）`,
    observation_window_below_7_days: `观察窗口不足 7 天（当前 ${operation.observationDays ?? 0} 天）`,
    missing_check: "尚无来源检查记录",
    lifecycle_not_shadow: "只有观察期来源可以开启观察",
    aggregator_discovery_only: "聚合来源仅用于发现，不进入事实采集",
    non_automated_source: "该来源受平台访问策略限制，系统保持隔离",
    empty_content: "最近检查没有可用内容",
    quality_below_60: "最近检查质量分低于 60",
    missing_freshness: "最近检查缺少内容新鲜度",
    content_older_than_90_days: "最近内容已超过 90 天",
  };
  if (labels[reason]) return labels[reason];
  if (reason.startsWith("latest_check_")) return `最近一次检查状态：${reason.slice(13)}`;
  if (reason.startsWith("policy_")) return `访问策略不允许：${reason.slice(7)}`;
  if (reason.startsWith("lifecycle_")) return `当前生命周期不支持此操作：${reason.slice(10)}`;
  return reason;
}

async function withBusy(button, action) {
  if (button.disabled) return;
  const label = button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "处理中…";
  try {
    await action();
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = label;
    }
  }
}

async function sourceLifecycle(id, action) {
  try {
    await api(`/api/admin/sources/${id}/lifecycle`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    toast("来源状态已更新");
    await loadAll();
  } catch (error) {
    toast(formatOperationError(error), true);
  }
}

async function runSource(sourceId) {
  try {
    const result = await api("/api/admin/pipeline/collect", {
      method: "POST",
      body: JSON.stringify({ sourceId }),
    });
    toast(
      result.errors?.length ? "拉取完成，但存在错误" : "单源拉取成功",
      Boolean(result.errors?.length),
    );
    await loadAll();
  } catch (error) {
    toast(formatOperationError(error), true);
  }
}

async function sourceObservation(sourceId, enabled) {
  try {
    await api(`/api/admin/sources/${sourceId}/observation`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
    toast(enabled ? "已进入 shadow 观察采集" : "已停止 shadow 观察采集");
    await loadAll();
  } catch (error) {
    toast(formatOperationError(error), true);
  }
}

function formatOperationError(error) {
  const evidence = error.payload?.evidence;
  if (!evidence) return error.message;
  return `${error.message}；最近检查 ${evidence.latestStatus ?? "无"}，健康 ${evidence.healthyChecks ?? 0} 次，观察 ${evidence.observationDays ?? 0} 天`;
}

function renderScout(filter = "") {
  const root = $("#scoutTable");
  root.replaceChildren();
  state.scout
    .filter((item) => includes(item, filter))
    .forEach((insight) => {
      const row = node("div", "table-row scout-admin-row");
      row.append(
        mainCell(insight.title, `${insight.kind} · ${insight.horizon}`),
        node(
          "span",
          "cell-muted",
          `证据 ${insight.evidence_score} / 新颖 ${insight.novelty_score}`,
        ),
        node("strong", "", String(insight.total_score)),
        node("span", "cell-muted", insight.status),
      );
      row.append(
        node(
          "span",
          "cell-muted",
          insight.status === "published"
            ? "已通过质量检查并自动发布"
            : "未通过质量检查，已自动归档",
        ),
      );
      root.append(row);
    });
}
function renderEvents(filter = "") {
  const root = $("#eventsTable");
  root.replaceChildren();
  state.events
    .filter((item) => includes(item, filter))
    .forEach((event) => {
      const row = node("div", "table-row");
      row.append(
        mainCell(event.title, `${event.company} · ${event.category}`),
        node("span", "cell-muted", new Date(event.happened_at).toLocaleDateString("zh-CN")),
        node(
          "span",
          "cell-muted",
          `C${event.confidence_score} H${event.heat_score} I${event.impact_score}`,
        ),
        node("span", "cell-muted", event.status),
      );
      row.append(
        node(
          "span",
          "cell-muted",
          event.status === "published" ? "已自动发布" : "仍有发布检查未通过",
        ),
      );
      root.append(row);
    });
}
function renderTracks(filter = "") {
  const root = $("#tracksTable");
  root.replaceChildren();
  state.tracks
    .filter((item) => includes(item, filter))
    .forEach((track) => {
      const row = node("div", "table-row");
      row.append(
        mainCell(`${track.icon} ${track.name}`, track.description),
        node("span", "cell-muted", `${track.kind} / ${track.perspective}`),
      );
      const color = input("color", track.color, "score-input");
      color.addEventListener("change", () =>
        patch(`/api/admin/tracks/${track.id}`, { color: color.value }),
      );
      row.append(color, node("span", "cell-muted", `#${track.order_index}`));
      const toggle = switcher(track.enabled === 1, () =>
        patch(`/api/admin/tracks/${track.id}`, { enabled: toggle.classList.contains("on") }),
      );
      row.append(toggle);
      root.append(row);
    });
}
function renderActors(filter = "") {
  const root = $("#actorsTable");
  root.replaceChildren();
  state.actors
    .filter((item) => includes(item, filter))
    .forEach((actor) => {
      const row = node("div", "table-row");
      row.append(
        mainCell(actor.name, `${actor.region} · ${actor.actor_type}`),
        node("span", "cell-muted", actor.scale),
      );
      const score = input("number", actor.table_score, "score-input");
      score.min = 0;
      score.max = 100;
      score.addEventListener("change", () =>
        patch(`/api/admin/actors/${actor.id}`, { tableScore: Number(score.value) }),
      );
      row.append(
        score,
        node(
          "span",
          "cell-muted",
          JSON.parse(actor.domains_json || "[]")
            .slice(0, 2)
            .join(" / "),
        ),
      );
      const toggle = switcher(actor.enabled === 1, () =>
        patch(`/api/admin/actors/${actor.id}`, { enabled: toggle.classList.contains("on") }),
      );
      row.append(toggle);
      root.append(row);
    });
}
function renderResources(filter = "") {
  const root = $("#resourcesTable");
  root.replaceChildren();
  state.resources
    .filter((item) => includes(item, filter))
    .forEach((resource) => {
      const row = node("div", "table-row");
      row.append(
        mainCell(resource.model, `${resource.provider} · ${resource.resource_type}`),
        node("span", "cell-muted", resource.audience),
        node("span", "cell-muted", resource.risk_level),
        node("span", "cell-muted", new Date(resource.verified_at).toLocaleDateString("zh-CN")),
      );
      const toggle = switcher(resource.enabled === 1, () =>
        patch(`/api/admin/resources/${resource.id}`, { enabled: toggle.classList.contains("on") }),
      );
      row.append(toggle);
      root.append(row);
    });
}
function renderView() {
  if (!state.view) return;
  $("#viewName").value = state.view.name;
  $("#viewDescription").value = state.view.description;
  $("#viewFilters").value = pretty(state.view.filters_json);
  $("#viewLayout").value = pretty(state.view.layout_json);
  $("#viewTheme").value = pretty(state.view.theme_json);
}
function pretty(value) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value || "{}";
  }
}
function includes(item, filter) {
  return !filter || JSON.stringify(item).toLowerCase().includes(filter.toLowerCase());
}
function mainCell(title, sub) {
  const cell = node("div", "table-main");
  cell.append(node("strong", "", title), node("small", "", sub));
  return cell;
}
function input(type, value, className) {
  const el = node("input", className);
  el.type = type;
  el.value = value;
  return el;
}
function switcher(on, callback) {
  const el = node("button", `switch${on ? " on" : ""}`);
  el.type = "button";
  el.addEventListener("click", () => {
    el.classList.toggle("on");
    callback();
  });
  return el;
}
async function patch(path, body) {
  try {
    await api(path, { method: "PATCH", body: JSON.stringify(body) });
    toast("已保存");
    await loadAll();
    return true;
  } catch (error) {
    const blockers = error.payload?.readiness?.blockers;
    toast(blockers?.length ? `${error.message}：${blockers.join("、")}` : error.message, true);
    return false;
  }
}
$("#saveView").addEventListener("click", async () => {
  try {
    await patch(`/api/admin/view/${state.view.id}`, {
      name: $("#viewName").value,
      description: $("#viewDescription").value,
      filters: JSON.parse($("#viewFilters").value),
      layout: JSON.parse($("#viewLayout").value),
      theme: JSON.parse($("#viewTheme").value),
      status: "published",
    });
  } catch (error) {
    toast(error.message, true);
  }
});
$("#saveToken").addEventListener("click", () => {
  state.token = $("#tokenInput").value.trim();
  sessionStorage.setItem("agent-pulse-admin-token", state.token);
  loadAll();
});
$("#adminNav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (!button) return;
  document.querySelectorAll("#adminNav button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  document.querySelectorAll(".tab-page").forEach((page) => {
    page.classList.toggle("active", page.dataset.page === button.dataset.tab);
  });
  $("#pageTitle").textContent = titles[button.dataset.tab];
  if (button.dataset.tab === "health") loadMonitor();
});
$("#discoveryStatusFilter").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  state.discoveryStatus = button.dataset.status;
  document.querySelectorAll("#discoveryStatusFilter button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  renderDiscoveries(document.querySelector('[data-search="discoveries"]').value);
});
document.querySelectorAll("[data-search]").forEach((field) => {
  field.addEventListener("input", () =>
    ({
      sources: renderSources,
      discoveries: renderDiscoveries,
      events: renderEvents,
      tracks: renderTracks,
      actors: renderActors,
      resources: renderResources,
      scout: renderScout,
    })[field.dataset.search](field.value),
  );
});
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.style.background = error ? "#fb6b66" : "#edf2f7";
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 2600);
}

// ─── Health Dashboard ────────────────────────────────────────────

async function loadMonitor() {
  const [report, checks] = await Promise.all([
    api("/api/admin/monitor"),
    api("/api/admin/source-checks?limit=500"),
  ]);
  if (!report) return;
  state.monitor = report;
  state.sourceChecks = checks;
  renderHealthMetrics(report);
  renderCoverageMap(report);
  renderAttentionList(report);
  renderRecommendations(report);
  renderSourceChecks(checks);
}

function renderHealthMetrics(report) {
  const grid = $("#healthMetrics");
  if (!grid) return;
  const items = [
    { label: "活跃来源", value: report.activeSources, cls: "ok" },
    {
      label: "已降级",
      value: report.degradedSources,
      cls: report.degradedSources > 5 ? "warn" : "ok",
    },
    {
      label: "已隔离",
      value: report.quarantinedSources,
      cls: report.quarantinedSources > 0 ? "critical" : "ok",
    },
    {
      label: "待激活",
      value: report.shadowSources,
      cls: report.shadowSources > 50 ? "warn" : "ok",
    },
    {
      label: "Shadow 观察",
      value: report.observedShadowSources ?? 0,
      cls: report.observedShadowSources > 0 ? "ok" : "warn",
    },
    { label: "已退休", value: report.retiredSources, cls: "ok" },
    { label: "草稿", value: report.draftSources, cls: "ok" },
    {
      label: "已检查",
      value: `${report.checkedSources}/${report.totalSources}`,
      cls: report.checkCoveragePercent < 50 ? "warn" : "ok",
    },
    {
      label: "检查通过",
      value: report.healthyCheckedSources,
      cls: report.healthyCheckedSources ? "ok" : "warn",
    },
    {
      label: "检查覆盖",
      value: `${report.checkCoveragePercent}%`,
      cls: report.checkCoveragePercent < 50 ? "critical" : "ok",
    },
    {
      label: "审计健康率",
      value: `${report.auditHealthyPercent ?? 0}%`,
      cls:
        report.auditHealthyPercent < 40
          ? "critical"
          : report.auditHealthyPercent < 70
            ? "warn"
            : "ok",
    },
    {
      label: "自动源异常",
      value: report.repairableCheckedSources ?? 0,
      cls: report.repairableCheckedSources > 0 ? "critical" : "ok",
    },
  ];
  grid.innerHTML = items
    .map(
      (item) =>
        `<div class="health-metric ${item.cls}"><div class="metric-value">${item.value}</div><div class="metric-label">${item.label}</div></div>`,
    )
    .join("");
}

function renderCoverageMap(report) {
  const map = $("#coverageMap");
  if (!map) return;
  map.innerHTML = report.coverageGaps
    .map((gap) => {
      const pct = Math.max(
        0,
        Math.min(100, Math.round((gap.current / Math.max(1, gap.target)) * 100)),
      );
      const barCls =
        gap.severity === "critical" ? "critical" : gap.severity === "warning" ? "warning" : "ok";
      return `<div class="coverage-row">
        <span class="cov-label">${escHtml(gap.label)}</span>
        <div class="cov-bar-wrap"><div class="cov-bar ${barCls}" style="width:${pct}%"></div></div>
        <span class="cov-count">有效 ${gap.current} · 目录 ${gap.catalogCurrent ?? 0} · 目标 ${gap.target}</span>
      </div>`;
    })
    .join("");
}

function renderAttentionList(report) {
  const list = $("#attentionList");
  if (!list) return;
  if (!report.sourcesNeedingAttention.length) {
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:var(--muted)">✓ 所有来源运行正常</div>';
    return;
  }
  const icons = {
    active: "◉",
    degraded: "⚠",
    quarantined: "✗",
    shadow: "◌",
    draft: "◌",
    retired: "⊘",
  };
  list.innerHTML = report.sourcesNeedingAttention
    .slice(0, 15)
    .map(
      (s) => `<div class="attention-item">
        <span class="att-icon">${icons[s.lifecycle] ?? "?"}</span>
        <span class="att-slug">${escHtml(s.slug)}</span>
        <span class="att-lifecycle ${escAttr(s.lifecycle)}">${escHtml(s.lifecycle)}</span>
        <span class="att-health">HP:${s.healthScore}</span>
        ${s.checkStatus ? `<span class="att-lifecycle ${s.checkStatus}">${escHtml(s.checkStatus)}</span>` : ""}
        ${s.itemCount !== null ? `<span class="att-health">${s.itemCount} items · Q${s.qualityScore ?? 0}</span>` : ""}
        ${s.lastError ? `<span class="att-error" title="${escAttr(s.lastError)}">${escHtml(s.lastError.slice(0, 60))}</span>` : ""}
      </div>`,
    )
    .join("");
}

function renderRecommendations(report) {
  const list = $("#recommendationsList");
  if (!list) return;
  if (!report.recommendations.length) {
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:var(--muted)">✓ 系统运行良好，暂无建议</div>';
    return;
  }
  list.innerHTML = report.recommendations
    .map((rec) => {
      const cls = rec.startsWith("[CRITICAL]")
        ? "critical"
        : rec.startsWith("[WARNING]")
          ? "warning"
          : "info";
      const icon = cls === "critical" ? "✗" : cls === "warning" ? "⚠" : "ℹ";
      return `<div class="rec-item ${cls}"><span class="rec-icon">${icon}</span><span>${escHtml(rec)}</span></div>`;
    })
    .join("");
}

async function applyHealthFixes() {
  try {
    const res = await fetch("/api/admin/pipeline/health", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: "{}",
    });
    if (res.ok) {
      const result = await res.json();
      toast(
        `健康策略已执行：降级 ${result.degraded}，隔离 ${result.quarantined}；恢复由连续健康检查自动推进`,
      );
      await loadMonitor();
    } else {
      toast("修复失败，请检查 Token", true);
    }
  } catch {
    toast("网络错误", true);
  }
}

function renderSourceChecks(checks) {
  const list = $("#sourceCheckList");
  if (!list) return;
  const latest = new Map();
  for (const check of checks) {
    if (!latest.has(check.source_id)) latest.set(check.source_id, check);
  }
  const rows = [...latest.values()].sort(
    (left, right) =>
      sourceCheckOrder(left.status) - sourceCheckOrder(right.status) ||
      left.source_slug.localeCompare(right.source_slug),
  );
  if (!rows.length) {
    list.innerHTML =
      '<div style="padding:24px;text-align:center;color:var(--muted)">尚无来源检查记录。运行 npm run sources:audit 建立基线。</div>';
    return;
  }
  list.innerHTML = rows
    .map(
      (check) => `<div class="source-check-row">
        <div><strong>${escHtml(check.source_name)}</strong><small>${escHtml(check.source_slug)} · ${escHtml(check.adapter)}</small></div>
        <span class="check-status ${escAttr(check.status)}">${escHtml(check.status)}</span>
        <span>${escHtml(check.access_status)} / ${escHtml(check.parse_status)}${check.proxy_used ? " · PROXY" : ""}</span>
        <span>${check.item_count} items</span>
        <span>Q${check.quality_score} · dup ${(check.duplicate_ratio_bps / 100).toFixed(1)}%</span>
        <span>${check.latest_item_at ? new Date(check.latest_item_at).toLocaleDateString("zh-CN") : "无内容时间"}</span>
        <span title="${escAttr(check.error_summary || "")}">${escHtml(check.repair_action)}</span>
      </div>`,
    )
    .join("");
}

function sourceCheckOrder(status) {
  return { failed: 0, degraded: 1, skipped: 2, healthy: 3 }[status] ?? 4;
}

function escHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = $("#refreshHealth");
  const applyBtn = $("#applyHealth");
  if (refreshBtn) refreshBtn.addEventListener("click", loadMonitor);
  if (applyBtn) applyBtn.addEventListener("click", applyHealthFixes);
});

loadAll();
