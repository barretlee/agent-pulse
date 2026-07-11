const TREND_PRIORITY = [
  "tech-evolution",
  "agi-progress",
  "commercialization",
  "investing",
  "china-catch-up",
  "model-economics",
];

const state = {
  events: [],
  tracks: [],
  actors: [],
  resources: [],
  scout: [],
  product: null,
  narratives: null,
  generatedAt: null,
  activeTool: "",
};

const $ = (selector) => document.querySelector(selector);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

async function load() {
  try {
    const [timeline, tracks, actors, resources, scout, product, narratives] = await Promise.all([
      fetchJson("./data/timeline.json"),
      fetchJson("./data/tracks.json"),
      fetchJson("./data/actors.json", []),
      fetchJson("./data/resources.json", []),
      fetchJson("./data/scout.json", { insights: [] }),
      fetchJson("./data/product.json", null),
      fetchJson("./data/narratives.json", null),
    ]);
    state.events = [...(timeline.events || [])].sort(
      (a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime(),
    );
    state.tracks = tracks || [];
    state.actors = actors || [];
    state.resources = resources || [];
    state.scout = scout?.insights || [];
    state.product = product;
    state.narratives = narratives;
    state.generatedAt = timeline.generatedAt || null;

    updateOverview();
    renderToday();
    renderTrends();
    renderEvolution();
    openFromHash();
  } catch (error) {
    $("#todayLead").append(node("div", "empty-state", `数据载入失败：${error.message}`));
  }
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

function updateOverview() {
  const highestValue = Math.max(0, ...state.events.map((event) => event.valueScore || 0));
  const hotCount = state.events.filter(
    (event) => event.heatScore >= 70 && event.confidenceScore >= 60,
  ).length;
  $("#heroScore").textContent = highestValue;
  $("#eventCount").textContent = state.events.length;
  $("#hotCount").textContent = hotCount;
  const generated = state.generatedAt ? new Date(state.generatedAt) : new Date();
  $("#generatedAt").textContent = `更新于 ${generated.toLocaleString("zh-CN", { hour12: false })}`;
  $("#footerTime").textContent = generated.toLocaleDateString("zh-CN");
}

function renderToday() {
  const leadRoot = $("#todayLead");
  const listRoot = $("#todayList");
  leadRoot.replaceChildren();
  listRoot.replaceChildren();
  if (!state.events.length) {
    leadRoot.append(node("div", "empty-state", "暂无达到公开门槛的事件。"));
    return;
  }

  const recent = recentDecisionEvents();
  const lead = [...recent].sort(
    (a, b) => b.valueScore - a.valueScore || new Date(b.happenedAt) - new Date(a.happenedAt),
  )[0];
  const button = node("button", "today-lead-button");
  button.type = "button";
  const meta = node("div", "today-meta");
  meta.append(
    node("span", "signal-label", "TODAY'S LEAD"),
    node("span", "", `${formatDate(lead.happenedAt)} · ${lead.company}`),
    node("strong", "", `价值 ${lead.valueScore}`),
  );
  button.append(
    meta,
    node("h3", "", lead.title),
    node("p", "today-fact", lead.factSummary),
    node("p", "today-action", lead.businessValue),
    node("span", "read-more", "查看判断与证据 →"),
  );
  button.addEventListener("click", () => openDrawer(lead));
  leadRoot.append(button);

  recent
    .filter((event) => event.id !== lead.id)
    .slice(0, 3)
    .forEach((event, index) => {
      listRoot.append(todayRow(event, index + 1));
    });
}

function recentDecisionEvents() {
  if (!state.events.length) return [];
  const anchor = state.generatedAt
    ? new Date(state.generatedAt).getTime()
    : new Date(state.events[0].happenedAt).getTime();
  const withinWeek = state.events.filter(
    (event) => anchor - new Date(event.happenedAt).getTime() <= 7 * 86_400_000,
  );
  return (withinWeek.length >= 4 ? withinWeek : state.events).slice(0, 6);
}

function todayRow(event, index) {
  const button = node("button", "today-row");
  button.type = "button";
  button.append(
    node("span", "today-index", String(index).padStart(2, "0")),
    node("span", "today-row-copy"),
    node("strong", "today-row-score", String(event.valueScore)),
  );
  button
    .querySelector(".today-row-copy")
    .append(
      node("small", "", `${formatDate(event.happenedAt)} · ${event.company}`),
      node("b", "", event.title),
      node("span", "", event.factSummary),
    );
  button.addEventListener("click", () => openDrawer(event));
  return button;
}

function renderSearch(query) {
  const root = $("#searchResults");
  const list = $("#searchResultList");
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    root.hidden = true;
    list.replaceChildren();
    return;
  }
  const results = state.events.filter((event) =>
    [
      event.title,
      event.factSummary,
      event.summary,
      event.company,
      ...(event.keywords || []),
      ...(event.tracks || []).map((track) => track.name),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
  root.hidden = false;
  list.replaceChildren();
  $("#searchCount").textContent = `${results.length} 条`;
  results.forEach((event) => {
    list.append(searchRow(event));
  });
  if (!results.length) list.append(node("p", "empty-copy", "没有匹配的公开事件。"));
}

function searchRow(event) {
  const button = node("button", "search-row");
  button.type = "button";
  button.append(
    node("span", "", `${formatDate(event.happenedAt)} · ${event.company}`),
    node("strong", "", event.title),
    node("i", "", `价值 ${event.valueScore}`),
  );
  button.addEventListener("click", () => openDrawer(event));
  return button;
}

function renderTrends() {
  const root = $("#trendGrid");
  root.replaceChildren();
  const tracks = TREND_PRIORITY.map((slug) => state.tracks.find((track) => track.slug === slug))
    .filter(Boolean)
    .slice(0, 6);
  tracks.forEach((track, index) => {
    root.append(trendCard(track, index));
  });
}

function trendCard(track, index) {
  const events = state.events.filter((event) =>
    (event.tracks || []).some((item) => item.slug === track.slug),
  );
  const latest = events[0];
  const narrative = state.narratives?.tracks?.find((item) => item.slug === track.slug);
  const article = node("article", `trend-card trend-${index + 1}`);
  const top = node("div", "trend-top");
  top.append(
    node("span", "trend-number", String(index + 1).padStart(2, "0")),
    node("span", "trend-state", trendState(events.length)),
  );
  article.append(
    top,
    node("h3", "", `${track.icon || "·"} ${track.name}`),
    node("p", "trend-description", narrative?.thesis || track.description),
  );
  const latestBlock = node("div", `trend-latest${latest ? "" : " empty"}`);
  latestBlock.append(
    node("span", "", narrative?.now ? "当前判断" : latest ? "最新确认节点" : "证据水位"),
    node("strong", "", narrative?.now || latest?.title || "暂无达到公开门槛的节点"),
    node(
      "small",
      "",
      latest
        ? `${latest.title} · ${formatDate(latest.happenedAt)} · 影响 ${latest.impactScore}`
        : "继续观察，不用弱信号填充结论",
    ),
  );
  article.append(latestBlock);
  if (narrative?.next) {
    const next = node("p", "trend-next");
    next.append(node("span", "", "NEXT"), document.createTextNode(narrative.next));
    article.append(next);
  }

  const detail = node("details", "trend-detail");
  detail.append(
    node("summary", "", events.length ? `查看 ${events.length} 个关键节点` : "为什么保持空白"),
  );
  const body = node("div", "trend-nodes");
  if (events.length) {
    events.forEach((event) => {
      body.append(trendEventButton(event));
    });
  } else {
    body.append(node("p", "", "该主线仍在数据目录中，但当前没有经过审核并公开的事件。"));
  }
  detail.append(body);
  article.append(detail);
  return article;
}

function trendState(count) {
  if (count >= 3) return "高密度";
  if (count >= 1) return "形成中";
  return "观察中";
}

function trendEventButton(event) {
  const button = node("button", "trend-node");
  button.type = "button";
  button.append(
    node("time", "", formatDate(event.happenedAt)),
    node("span", "", event.title),
    node("strong", "", String(event.valueScore)),
  );
  button.addEventListener("click", () => openDrawer(event));
  return button;
}

function renderEvolution() {
  const root = $("#evolutionStrip");
  root.replaceChildren();
  const eras = state.narratives?.eras || [];
  if (eras.length) {
    eras.slice(0, 4).forEach((era, index) => {
      root.append(narrativeEraCard(era, index));
    });
    const horizon = state.narratives?.horizon;
    $("#coverageNote").textContent = horizon
      ? `叙事观察窗：${horizon.start} 至 ${horizon.end}。详细事件仍以可点击证据节点为准。`
      : "演进阶段来自已发布事件的叙事收敛。";
    return;
  }
  const anchor = state.generatedAt ? new Date(state.generatedAt) : new Date();
  halfYearPeriods(anchor, 4).forEach((period) => {
    const events = state.events.filter((event) => {
      const date = new Date(event.happenedAt);
      return date >= period.start && date < period.end;
    });
    root.append(evolutionCard(period, events));
  });
  if (!state.events.length) {
    $("#coverageNote").textContent = "当前没有公开节点。";
    return;
  }
  const oldest = state.events.at(-1);
  const newest = state.events[0];
  $("#coverageNote").textContent =
    `当前公开证据覆盖 ${formatDate(oldest.happenedAt)} 至 ${formatDate(newest.happenedAt)}；` +
    "页面固定保留 24 个月观察窗，并如实显示无数据区间。";
}

function narrativeEraCard(era, index) {
  const article = node("article", `evolution-card narrative-era${index === 0 ? " current" : ""}`);
  article.append(
    node("span", "evolution-period", era.period || era.label),
    node("strong", "era-index", String(index + 1).padStart(2, "0")),
    node("h3", "", era.label),
    node("p", "", era.summary),
  );
  return article;
}

function halfYearPeriods(anchor, count) {
  const startMonth = anchor.getMonth() < 6 ? 0 : 6;
  const currentStart = new Date(anchor.getFullYear(), startMonth, 1);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - index * 6, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 6, 1);
    return {
      start,
      end,
      label: `${start.getFullYear()} H${start.getMonth() === 0 ? 1 : 2}`,
      current: index === 0,
    };
  });
}

function evolutionCard(period, events) {
  const article = node(
    "article",
    `evolution-card${period.current ? " current" : ""}${events.length ? "" : " empty"}`,
  );
  const strongest = [...events].sort((a, b) => b.impactScore - a.impactScore)[0];
  article.append(
    node("span", "evolution-period", period.label),
    node("strong", "evolution-count", String(events.length).padStart(2, "0")),
    node("small", "", events.length ? "公开关键节点" : "暂无公开节点"),
  );
  if (strongest) {
    const lead = node("button", "evolution-lead");
    lead.type = "button";
    lead.append(
      node("b", "", strongest.title),
      node("span", "", `影响 ${strongest.impactScore} →`),
    );
    lead.addEventListener("click", () => openDrawer(strongest));
    article.append(lead);
  } else {
    article.append(node("p", "evolution-empty", "保留空白，等待可验证转折。"));
  }
  if (events.length > 1) {
    const detail = node("details", "evolution-detail");
    detail.append(node("summary", "", `展开本期 ${events.length} 个节点`));
    const body = node("div");
    events.forEach((event) => {
      body.append(trendEventButton(event));
    });
    detail.append(body);
    article.append(detail);
  }
  return article;
}

function renderTool(tool) {
  const panel = $("#toolPanel");
  panel.replaceChildren();
  panel.hidden = false;
  if (tool === "scout") renderScoutTool(panel);
  if (tool === "actors") renderActorTool(panel);
  if (tool === "resources") renderResourceTool(panel);
  if (tool === "product") renderProductTool(panel);
}

function renderScoutTool(root) {
  root.append(
    toolHeading("星探机会", "证据交汇处产生的创业、内容和工作火花；默认不打断主阅读路径。"),
  );
  const grid = node("div", "tool-grid scout-tool-grid");
  state.scout.slice(0, 3).forEach((insight) => {
    const card = node("article", "scout-card");
    card.append(
      node("span", "", `${scoutKind(insight.kind)} · ${insight.totalScore}`),
      node("h3", "", insight.title),
      node("p", "", insight.hypothesis),
    );
    const detail = node("details");
    detail.append(node("summary", "", "展开行动与反证"));
    const body = node("div");
    [
      ["为什么现在", insight.whyNow],
      ["最小动作", insight.suggestedAction],
      ["可能错在哪", insight.counterSignals],
    ].forEach(([label, copy]) => {
      const section = node("section", "scout-detail-section");
      section.append(node("strong", "", label), node("p", "", copy));
      body.append(section);
    });
    detail.append(body);
    card.append(detail);
    grid.append(card);
  });
  if (!state.scout.length) grid.append(node("p", "empty-copy", "暂无达到发布门槛的机会。"));
  root.append(grid);
}

function renderActorTool(root) {
  root.append(
    toolHeading("中国角色", "按已有能力、生态与商业证据查看当前牌桌，不用声量代替进展。"),
  );
  const grid = node("div", "actor-tool-grid");
  state.actors
    .filter((actor) => actor.region === "CN")
    .sort((a, b) => b.tableScore - a.tableScore)
    .slice(0, 10)
    .forEach((actor, index) => {
      const card = node("article", "actor-tool-card");
      card.append(
        node("span", "", String(index + 1).padStart(2, "0")),
        node("strong", "", actor.name),
        node("small", "", `${actor.scale} · ${(actor.domains || []).slice(0, 2).join(" / ")}`),
        node("b", "", String(actor.tableScore)),
      );
      grid.append(card);
    });
  root.append(grid);
}

function renderResourceTool(root) {
  root.append(toolHeading("模型获取", "官方入口和价格证据优先；第三方比价仅作购买前参考。"));
  const grid = node("div", "resource-tool-grid");
  state.resources.slice(0, 9).forEach((resource) => {
    const card = node("article", "resource-card");
    card.append(
      node(
        "span",
        "",
        `${resource.audience} · ${resource.riskLevel === "official" ? "官方" : "参考"}`,
      ),
      node("h3", "", resource.model),
      node("p", "", `${resource.provider} · ${resource.planName}`),
    );
    const links = node("div", "resource-links");
    const official = safeLink("官方入口 ↗", resource.purchaseUrl);
    const evidence = safeLink("价格证据 ↗", resource.sourceUrl);
    if (official) links.append(official);
    if (evidence) links.append(evidence);
    card.append(links);
    grid.append(card);
  });
  const priceAi = safeLink("前往 PriceAI 做进一步比价 ↗", "https://priceai.cc");
  if (priceAi) {
    priceAi.className = "priceai-link";
    root.append(priceAi);
  }
}

function renderProductTool(root) {
  root.append(toolHeading("系统水位", "公开当前真实能力，不把规划中的能力包装成已经完成。"));
  if (!state.product) {
    root.append(node("p", "empty-copy", "系统评测数据暂不可用。"));
    return;
  }
  const summary = node("div", "product-summary");
  [
    ["版本", `v${state.product.version}`],
    ["来源目录", `${state.product.sourceCoverage?.total || 0}+`],
    ["系统评分", state.product.evaluation?.overallScore ?? "—"],
  ].forEach(([label, value]) => {
    const item = node("div");
    item.append(node("span", "", label), node("strong", "", String(value)));
    summary.append(item);
  });
  root.append(summary);
  const stages = node("div", "product-stages");
  (state.product.roadmap || [])
    .filter((stage) => stage.status === "current" || stage.status === "building")
    .forEach((stage) => {
      const card = node("article");
      card.append(
        node("span", "", `STATE ${stage.state} · ${stage.status}`),
        node("h3", "", stage.name),
        node("p", "", stage.promise),
      );
      stages.append(card);
    });
  root.append(stages);
}

function toolHeading(title, copy) {
  const header = node("header", "tool-heading");
  header.append(node("h3", "", title), node("p", "", copy));
  return header;
}

function scoutKind(kind) {
  return { venture: "创业火花", media: "内容机会", work: "工作杠杆" }[kind] || "认知火花";
}

function safeLink(text, href) {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const anchor = node("a", "", text);
    anchor.href = url.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  } catch {
    return null;
  }
}

function openDrawer(event) {
  $("#drawerCategory").textContent = event.category;
  $("#drawerDate").textContent = formatDate(event.happenedAt);
  $("#drawerTitle").textContent = event.title;
  $("#drawerFact").textContent = event.factSummary;
  $("#drawerSummary").textContent = event.summary;
  $("#drawerTechnical").textContent = event.technicalInsight;
  $("#drawerIndustry").textContent = event.industryInsight;
  $("#drawerBusiness").textContent = event.businessValue;
  $("#drawerFuture").textContent = event.futureOutlook;

  const scores = $("#drawerScores");
  scores.replaceChildren();
  [
    ["可信", event.confidenceScore],
    ["热度", event.heatScore],
    ["影响", event.impactScore],
    ["价值", event.valueScore],
  ].forEach(([label, value]) => {
    const chip = node("div", "score-chip");
    chip.append(node("strong", "", String(value)), node("span", "", label));
    scores.append(chip);
  });

  const keywords = $("#drawerKeywords");
  keywords.replaceChildren();
  (event.keywords || []).forEach((item) => {
    keywords.append(node("span", "", item));
  });

  const tracks = $("#drawerTracks");
  tracks.replaceChildren();
  (event.tracks || []).forEach((item) => {
    tracks.append(node("span", "", `${item.icon} ${item.name} · ${item.stage}`));
  });

  const evidence = $("#drawerEvidence");
  evidence.replaceChildren();
  (event.evidence || []).forEach((item) => {
    const anchor = safeLink("", item.url);
    if (!anchor) return;
    anchor.className = "evidence-item";
    anchor.append(
      node("strong", "", item.title),
      node("span", "", `${item.source} · ${item.role} · ${formatDate(item.publishedAt)}`),
    );
    evidence.append(anchor);
  });

  $("#drawerBackdrop").hidden = false;
  $("#detailDrawer").classList.add("open");
  $("#detailDrawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  history.replaceState(null, "", `#event=${event.slug}`);
}

function closeDrawer() {
  $("#drawerBackdrop").hidden = true;
  $("#detailDrawer").classList.remove("open");
  $("#detailDrawer").setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  history.replaceState(null, "", location.pathname + location.search);
}

function openFromHash() {
  const slug = new URLSearchParams(location.hash.slice(1)).get("event");
  const event = state.events.find((item) => item.slug === slug);
  if (event) openDrawer(event);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

$("#searchInput").addEventListener("input", (event) => renderSearch(event.target.value));
$("#toolSwitcher").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tool]");
  if (!button) return;
  const next = button.dataset.tool;
  const panel = $("#toolPanel");
  if (state.activeTool === next && !panel.hidden) {
    state.activeTool = "";
    panel.hidden = true;
    button.classList.remove("active");
    return;
  }
  state.activeTool = next;
  document.querySelectorAll("#toolSwitcher button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  renderTool(next);
});

$("#drawerClose").addEventListener("click", closeDrawer);
$("#drawerBackdrop").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

const themes = ["midnight", "paper", "signal"];
const savedTheme = localStorage.getItem("agent-pulse-theme");
if (themes.includes(savedTheme)) document.documentElement.dataset.theme = savedTheme;
$("#themeButton").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "midnight";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  document.documentElement.dataset.theme = next;
  localStorage.setItem("agent-pulse-theme", next);
});

load();
