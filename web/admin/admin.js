const state = {
  token: sessionStorage.getItem("agent-pulse-admin-token") || "",
  sources: [],
  events: [],
  tracks: [],
  actors: [],
  resources: [],
  view: null,
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
    const [dashboard, sources, events, jobs, tracks, actors, resources, view] = await Promise.all([
      api("/api/admin/dashboard"),
      api("/api/admin/sources"),
      api("/api/admin/events"),
      api("/api/admin/jobs"),
      api("/api/admin/tracks"),
      api("/api/admin/actors"),
      api("/api/admin/resources"),
      api("/api/admin/view"),
    ]);
    Object.assign(state, { sources, events, tracks, actors, resources, view });
    renderMetrics(dashboard);
    renderJobs(jobs);
    renderSources();
    renderEvents();
    renderTracks();
    renderActors();
    renderResources();
    renderView();
  } catch (error) {
    toast(error.message, true);
  }
}
function renderMetrics(data) {
  const labels = {
    sources: "信源",
    signals: "信号",
    drafts: "待审",
    published: "已发布",
    failedJobs: "失败任务",
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
        mainCell(source.name, `${source.slug} · ${source.adapter}`),
        node("span", "cell-muted", `Tier ${source.tier} / ${source.role}`),
      );
      const score = input("number", source.authority_score, "score-input");
      score.min = 0;
      score.max = 100;
      score.addEventListener("change", () =>
        patch(`/api/admin/sources/${source.id}`, { authorityScore: Number(score.value) }),
      );
      row.append(score, node("span", "cell-muted", source.last_error ? "ERROR" : "HEALTHY"));
      const toggle = switcher(source.enabled === 1, () =>
        patch(`/api/admin/sources/${source.id}`, { enabled: toggle.classList.contains("on") }),
      );
      row.append(toggle);
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
document.querySelectorAll("[data-search]").forEach((field) => {
  field.addEventListener("input", () =>
    ({
      sources: renderSources,
      events: renderEvents,
      tracks: renderTracks,
      actors: renderActors,
      resources: renderResources,
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
