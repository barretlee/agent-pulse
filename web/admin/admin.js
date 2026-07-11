const state = {
  token: sessionStorage.getItem("agent-pulse-admin-token") || "",
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
};
const $ = (selector) => document.querySelector(selector);
const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};
const titles = {
  dashboard: "指挥中心",
  sources: "信源矩阵",
  discoveries: "来源雷达",
  scout: "星探驾驶舱",
  evaluation: "评测中心",
  events: "事件与发布",
  tracks: "主线编排",
  actors: "角色雷达",
  resources: "模型资源",
  view: "视觉与视图",
};
$("#tokenInput").value = state.token;

async function api(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
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
    });
    renderMetrics(dashboard);
    renderJobs(jobs);
    renderSources();
    renderDiscoveries();
    renderScout();
    renderEvaluation();
    renderEvents();
    renderTracks();
    renderActors();
    renderResources();
    renderView();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderEvaluation() {
  const root = $("#evaluationGrid");
  const capabilityRoot = $("#capabilityMap");
  root.replaceChildren();
  capabilityRoot.replaceChildren();
  if (!state.evaluation) {
    $("#evaluationScore").textContent = "—";
    $("#evaluationStatus").textContent = "点击流水线中的评测开始";
    return;
  }
  $("#evaluationScore").textContent = state.evaluation.overallScore;
  $("#evaluationStatus").textContent =
    `${state.evaluation.status} · v${state.evaluation.releaseVersion}`;
  state.evaluation.dimensions.forEach((dimension) => {
    const card = node("article", `evaluation-card ${dimension.status}`);
    const top = node("div", "evaluation-card-top");
    top.append(node("strong", "", dimension.name), node("b", "", String(dimension.score)));
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
          ? `样本 ${dimension.sampleSize}`
          : `证据不足 · 样本 ${dimension.sampleSize}`,
      ),
      node("p", "", dimension.summary),
      node("small", "", `下一步：${dimension.nextAction}`),
    );
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
    sources: "信源",
    signals: "信号",
    drafts: "待审",
    published: "已发布",
    failedJobs: "失败任务",
    degradedSources: "异常信源",
    scoutInbox: "星探待审",
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
          `Tier ${source.tier} / ${source.role}\n${source.lifecycle_status}`,
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
        button.addEventListener("click", () => sourceLifecycle(source.id, action));
        actions.append(button);
      });
      const run = node("button", "row-action", "单源拉取");
      run.addEventListener("click", () => runSource(source.id));
      if (["shadow", "active", "degraded"].includes(source.lifecycle_status)) actions.append(run);
      row.append(actions);
      root.append(row);
    });
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
    ["candidate", "候选待复核"],
    ["matched_source", "已匹配一手源"],
    ["merged_signal", "已并入信号"],
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
  };
}

function discoveryStatusLabel(status) {
  return (
    {
      pending: "待判定",
      candidate: "候选待复核",
      matched_source: "已匹配一手源",
      merged_signal: "已并入信号",
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

async function sourceLifecycle(id, action) {
  try {
    await api(`/api/admin/sources/${id}/lifecycle`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    toast("来源状态已更新");
    await loadAll();
  } catch (error) {
    toast(error.message, true);
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
    toast(error.message, true);
  }
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
      const actions = node("div", "row-actions");
      const transitions =
        {
          inbox: [
            ["considering", "细看"],
            ["accepted", "接受"],
            ["dismissed", "忽略"],
          ],
          considering: [
            ["accepted", "接受"],
            ["dismissed", "忽略"],
          ],
          accepted: [
            ["published", "发布"],
            ["archived", "归档"],
          ],
          published: [["archived", "下线"]],
          dismissed: [["inbox", "重开"]],
          archived: [["inbox", "重开"]],
        }[insight.status] || [];
      transitions.forEach(([status, label]) => {
        const button = node("button", "row-action", label);
        button.addEventListener("click", () => patch(`/api/admin/scout/${insight.id}`, { status }));
        actions.append(button);
      });
      row.append(actions);
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
      const edit = node("button", "row-action", "编辑 / 发布");
      edit.addEventListener("click", () => openEvent(event));
      row.append(edit);
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
  } catch (error) {
    toast(error.message, true);
  }
}
function openEvent(event) {
  const form = $("#eventForm");
  [
    "id",
    "title",
    "factSummary",
    "summary",
    "technicalInsight",
    "industryInsight",
    "businessValue",
    "futureOutlook",
    "confidenceScore",
    "heatScore",
    "impactScore",
    "status",
  ].forEach((name) => {
    const key =
      {
        factSummary: "fact_summary",
        technicalInsight: "technical_insight",
        industryInsight: "industry_insight",
        businessValue: "business_value",
        futureOutlook: "future_outlook",
        confidenceScore: "confidence_score",
        heatScore: "heat_score",
        impactScore: "impact_score",
      }[name] || name;
    form.elements[name].value = event[key] ?? "";
  });
  form.elements.featured.checked = event.featured === 1;
  $("#eventModal").hidden = false;
}
$("#eventForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = form.get("id");
  const body = {};
  [
    "title",
    "factSummary",
    "summary",
    "technicalInsight",
    "industryInsight",
    "businessValue",
    "futureOutlook",
    "status",
  ].forEach((key) => {
    body[key] = form.get(key);
  });
  ["confidenceScore", "heatScore", "impactScore"].forEach((key) => {
    body[key] = Number(form.get(key));
  });
  body.featured = event.currentTarget.elements.featured.checked;
  await patch(`/api/admin/events/${id}`, body);
  $("#eventModal").hidden = true;
});
$(".modal-close").addEventListener("click", () => ($("#eventModal").hidden = true));
$("#eventModal").addEventListener("click", (event) => {
  if (event.target === $("#eventModal")) $("#eventModal").hidden = true;
});
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
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    $("#pipelineStatus").textContent = "RUNNING";
    try {
      const result = await api(`/api/admin/pipeline/${action}`, { method: "POST", body: "{}" });
      $("#pipelineOutput").textContent = JSON.stringify(result, null, 2);
      $("#pipelineStatus").textContent = "DONE";
      await loadAll();
    } catch (error) {
      $("#pipelineOutput").textContent = error.message;
      $("#pipelineStatus").textContent = "FAILED";
    }
  });
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
loadAll();
