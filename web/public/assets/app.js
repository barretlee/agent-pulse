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
  activeLine: TREND_PRIORITY[0],
  activeTrack: "verified",
  query: "",
  selectedEventId: null,
  activeTool: "",
};

const $ = (selector) => document.querySelector(selector);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = displayText(text);
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
      (left, right) => new Date(right.happenedAt) - new Date(left.happenedAt),
    );
    state.tracks = tracks || [];
    state.actors = actors || [];
    state.resources = resources || [];
    state.scout = scout?.insights || [];
    state.product = product;
    state.narratives = narratives;
    state.generatedAt = timeline.generatedAt || null;

    updateOverview();
    renderDecisionBrief();
    renderLineTabs();
    renderLineFocus();
    renderTimelineFilters();
    renderTimeline();
    renderEvolution();

    const hashEvent = eventFromHash();
    const defaultEvent = hashEvent || decisionLead();
    if (defaultEvent)
      openPreview(defaultEvent, {
        updateHash: Boolean(hashEvent),
        revealOnMobile: Boolean(hashEvent),
      });
  } catch (error) {
    $("#decisionBrief").append(node("div", "empty-state", `数据载入失败：${error.message}`));
    $("#timelineStream").append(node("div", "empty-state", "公开时间轴暂不可用。"));
  }
}

async function fetchJson(path, fallback) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  if (fallback !== undefined) return fallback;
  throw lastError;
}

function updateOverview() {
  const eventCount = state.events.length;
  const primaryCount = state.events.filter(hasPrimaryEvidence).length;
  const multiSourceCount = state.events.filter(
    (event) => hasPrimaryEvidence(event) && evidenceStats(event).sourceCount >= 2,
  ).length;
  const latest = state.events[0] ? new Date(state.events[0].happenedAt) : null;
  const oldest = state.events.at(-1) ? new Date(state.events.at(-1).happenedAt) : null;
  const generated = state.generatedAt ? new Date(state.generatedAt) : new Date();
  const ageHours = latest ? Math.max(0, (Date.now() - latest.getTime()) / 3_600_000) : null;

  $("#primaryRate").textContent = eventCount
    ? `${Math.round((primaryCount / eventCount) * 100)}%`
    : "—";
  $("#eventCount").textContent = String(eventCount);
  $("#crossVerified").textContent = String(multiSourceCount);
  $("#coverageSpan").textContent = oldest && latest ? formatCoverage(oldest, latest) : "—";

  const freshness = $("#generatedAt");
  freshness.textContent = latest
    ? `更新 ${generated.toLocaleString("zh-CN", { hour12: false })} · 最新证据 ${formatRelativeHours(ageHours)}`
    : `更新 ${generated.toLocaleString("zh-CN", { hour12: false })}`;
  freshness.classList.toggle("stale", ageHours !== null && ageHours > 24);
  $("#footerTime").textContent = generated.toLocaleDateString("zh-CN");
}

function decisionLead() {
  const recent = recentDecisionEvents();
  return [...recent].sort(
    (left, right) =>
      Number(hasPrimaryEvidence(right)) - Number(hasPrimaryEvidence(left)) ||
      (right.valueScore || 0) - (left.valueScore || 0) ||
      new Date(right.happenedAt) - new Date(left.happenedAt),
  )[0];
}

function recentDecisionEvents() {
  if (!state.events.length) return [];
  const anchor = state.generatedAt
    ? new Date(state.generatedAt).getTime()
    : new Date(state.events[0].happenedAt).getTime();
  const withinWeek = state.events.filter((event) => {
    const age = anchor - new Date(event.happenedAt).getTime();
    return age >= 0 && age <= 7 * 86_400_000;
  });
  return withinWeek.length ? withinWeek : state.events.slice(0, 8);
}

function renderDecisionBrief() {
  const root = $("#decisionBrief");
  root.replaceChildren();
  const lead = decisionLead();
  if (!lead) {
    root.append(node("div", "empty-state", "暂无达到公开门槛的决策事件。"));
    return;
  }

  const stats = evidenceStats(lead);
  const main = node("article", "brief-main");
  const meta = node("div", "brief-meta");
  meta.append(
    node("span", "brief-priority", "优先阅读"),
    node("span", "", `${formatDate(lead.happenedAt)} · ${lead.company || "主体未知"}`),
  );
  const proof = node("div", "brief-proof");
  proof.append(
    node("span", "proof-pill", evidenceLabel(lead)),
    node("span", "", `${stats.evidenceCount} 条公开证据 · ${stats.sourceCount} 个独立来源`),
  );
  const open = node("button", "brief-open", "进入证据预览 →");
  open.type = "button";
  open.addEventListener("click", () => {
    openPreview(lead, { updateHash: true, revealOnMobile: true });
    $("#timeline").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  main.append(
    meta,
    node("h3", "", lead.title),
    node("p", "brief-fact", lead.factSummary),
    proof,
    open,
  );

  const lenses = node("aside", "brief-lenses", "");
  [
    ["为什么重要 / 分析", lead.industryInsight || lead.summary],
    ["影响谁 / 决策", lead.businessValue],
    ["接下来观察 / 预测", lead.futureOutlook],
  ].forEach(([label, copy], index) => {
    const lens = node("section", `brief-lens${index === 2 ? " next" : ""}`);
    lens.append(node("span", "", label), node("strong", "", copy || "暂无经过审核的判断。"));
    lenses.append(lens);
  });
  root.append(main, lenses);
}

function renderLineTabs() {
  const root = $("#lineTabs");
  root.replaceChildren();
  strategicTracks().forEach((track, index) => {
    const events = eventsForTrack(track.slug);
    const button = node("button", "line-tab");
    button.type = "button";
    button.role = "tab";
    button.dataset.track = track.slug;
    button.setAttribute("aria-selected", String(state.activeLine === track.slug));
    button.append(
      node("span", "", `${String(index + 1).padStart(2, "0")} · ${events.length} 节点`),
      node("strong", "", `${track.icon || "·"} ${track.name}`),
    );
    button.addEventListener("click", () => {
      state.activeLine = track.slug;
      root.querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-selected", String(item === button));
      });
      renderLineFocus();
    });
    root.append(button);
  });
}

function renderLineFocus() {
  const root = $("#lineFocus");
  root.replaceChildren();
  const track = strategicTracks().find((item) => item.slug === state.activeLine);
  if (!track) {
    root.append(node("div", "empty-state", "当前主线没有可公开内容。"));
    return;
  }
  const narrative = state.narratives?.tracks?.find((item) => item.slug === track.slug);
  const events = eventsForTrack(track.slug);

  const thesis = node("article", "line-thesis");
  thesis.append(
    node("span", "", "CURRENT THESIS · 系统分析"),
    node("h3", "", narrative?.now || track.name),
    node("p", "", narrative?.thesis || track.description),
  );
  const next = node("div", "line-next");
  next.append(
    node("span", "", "NEXT SIGNAL · 待验证"),
    node("strong", "", narrative?.next || "继续等待能改变当前判断的一手证据。"),
  );
  thesis.append(next);

  const evidence = node("div", "line-evidence");
  const evidenceHead = node("div", "line-evidence-head");
  evidenceHead.append(
    node("span", "", "EVIDENCE SPINE"),
    node("strong", "", `${events.length} 个公开节点`),
  );
  evidence.append(evidenceHead);
  events.slice(0, 6).forEach((event) => {
    const button = node("button", "line-node");
    button.type = "button";
    button.append(
      node("time", "", formatShortDate(event.happenedAt)),
      node("span", ""),
      node("small", "", evidenceLabel(event)),
    );
    button
      .querySelector("span")
      .append(node("strong", "", event.title), node("small", "", event.company || "主体未知"));
    button.addEventListener("click", () => {
      state.activeTrack = track.slug;
      renderTimelineFilters();
      renderTimeline();
      openPreview(event, { updateHash: true, revealOnMobile: true });
      $("#timeline").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    evidence.append(button);
  });
  if (!events.length) evidence.append(node("p", "empty-copy", "暂无达到公开门槛的证据节点。"));
  root.append(thesis, evidence);
}

function renderTimelineFilters() {
  const root = $("#timelineFilters");
  root.replaceChildren();
  const options = [
    { slug: "verified", name: "证据较强", icon: "✓" },
    { slug: "all", name: "全部事件", icon: "" },
    ...strategicTracks(),
  ];
  options.forEach((track) => {
    const button = node(
      "button",
      `filter-chip${state.activeTrack === track.slug ? " active" : ""}`,
    );
    button.type = "button";
    button.dataset.track = track.slug;
    button.textContent = `${track.icon || ""} ${track.name}`.trim();
    button.addEventListener("click", () => {
      state.activeTrack = track.slug;
      renderTimelineFilters();
      renderTimeline();
    });
    root.append(button);
  });
}

function filteredEvents() {
  const query = state.query.trim().toLowerCase();
  return state.events.filter((event) => {
    const trackMatch =
      state.activeTrack === "all" ||
      (state.activeTrack === "verified" && hasPrimaryEvidence(event)) ||
      (event.tracks || []).some((track) => track.slug === state.activeTrack);
    if (!trackMatch) return false;
    if (!query) return true;
    return [
      event.title,
      event.factSummary,
      event.summary,
      event.company,
      ...(event.keywords || []),
      ...(event.tracks || []).map((track) => track.name),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderTimeline() {
  const root = $("#timelineStream");
  root.replaceChildren();
  const events = filteredEvents();
  $("#timelineCount").textContent = `${events.length} 个节点`;
  if (!events.length) {
    root.append(node("div", "empty-state", "没有匹配的公开事件。可以清空搜索或切换主线。"));
    return;
  }

  const groups = new Map();
  events.forEach((event) => {
    const key = monthKey(event.happenedAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });

  groups.forEach((items, label) => {
    const group = node("section", "month-group");
    group.append(node("h3", "month-label", label));
    items.forEach((event) => {
      group.append(timelineItem(event));
    });
    root.append(group);
  });
}

function timelineItem(event) {
  const button = node(
    "button",
    `timeline-item${state.selectedEventId === event.id ? " active" : ""}`,
  );
  button.type = "button";
  button.dataset.eventId = event.id;
  const top = node("div", "item-top");
  const firstTrack = event.tracks?.[0];
  const stats = evidenceStats(event);
  top.append(
    node("time", "", formatShortDate(event.happenedAt)),
    node("span", "item-track", firstTrack?.name || event.category || "未分类"),
    node("span", "", event.company || "主体未知"),
    node(
      "span",
      `item-proof${stats.sourceCount >= 2 || hasPrimaryEvidence(event) ? "" : " weak"}`,
      evidenceLabel(event),
    ),
  );
  const footer = node("div", "item-footer");
  (event.keywords || []).slice(0, 2).forEach((keyword) => {
    footer.append(node("span", "item-keyword", keyword));
  });
  footer.append(node("span", "item-open", "预览 →"));
  button.append(top, node("h3", "", event.title), node("p", "", event.factSummary), footer);
  button.addEventListener("click", () =>
    openPreview(event, { updateHash: true, revealOnMobile: true }),
  );
  return button;
}

function openPreview(event, options = {}) {
  state.selectedEventId = event.id;
  $("#previewEmpty").hidden = true;
  $("#previewContent").hidden = false;
  $("#drawerCategory").textContent = displayText(categoryName(event.category));
  $("#drawerDate").textContent = displayText(
    `${formatDate(event.happenedAt)} · ${event.company || "主体未知"}`,
  );
  $("#drawerTitle").textContent = displayText(event.title);
  $("#drawerFact").textContent = displayText(
    clipText(event.factSummary || "暂无经过审核的事实摘要。", 520),
  );
  $("#drawerSummary").textContent = displayText(
    clipText(event.summary || "暂无经过审核的分析摘要。", 420),
  );
  $("#drawerTechnical").textContent = displayText(
    clipText(event.technicalInsight || "暂无经过审核的技术判断。", 420),
  );
  $("#drawerIndustry").textContent = displayText(
    clipText(event.industryInsight || "暂无经过审核的行业判断。", 420),
  );
  $("#drawerBusiness").textContent = displayText(
    clipText(event.businessValue || "暂无经过审核的决策建议。", 420),
  );
  $("#drawerFuture").textContent = displayText(
    clipText(event.futureOutlook || "暂无经过审核的后续观察点。", 420),
  );

  const stats = evidenceStats(event);
  const status = $("#evidenceStatus");
  status.className = `evidence-status${stats.sourceCount >= 2 ? " multi" : ""}`;
  status.textContent = evidenceStatusCopy(event);

  const scores = $("#drawerScores");
  scores.replaceChildren();
  [
    ["可信度", event.confidenceScore],
    ["传播热度", event.heatScore],
    ["行业影响", event.impactScore],
    ["决策价值", event.valueScore],
  ].forEach(([label, value]) => {
    const chip = node("div", "score-chip");
    chip.title = Number.isFinite(value) ? `系统原始估计：${value}/100` : "暂无评分";
    chip.append(node("strong", "", scoreBand(value)), node("span", "", label));
    scores.append(chip);
  });

  const keywords = $("#drawerKeywords");
  keywords.replaceChildren();
  (event.keywords || []).forEach((keyword) => {
    keywords.append(node("span", "", keyword));
  });

  const tracks = $("#drawerTracks");
  tracks.replaceChildren();
  (event.tracks || []).forEach((track) => {
    tracks.append(
      node("span", "", `${track.icon || "·"} ${track.name} · ${track.stage || "观察"}`),
    );
  });

  renderEvidence(event);
  document.querySelectorAll(".timeline-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.eventId === event.id);
  });

  const preview = $("#detailDrawer");
  if (options.revealOnMobile && mobilePreview.matches) {
    preview.classList.add("open");
    $("#drawerBackdrop").hidden = false;
    document.body.classList.add("drawer-open");
  }
  if (options.updateHash) history.replaceState(null, "", `#event=${event.slug}`);
}

function renderEvidence(event) {
  const root = $("#drawerEvidence");
  root.replaceChildren();
  const items = event.evidence || [];
  const stats = evidenceStats(event);
  const level = node(
    "div",
    `evidence-level${stats.sourceCount >= 2 ? " multi" : ""}`,
    evidenceStatusCopy(event),
  );
  root.append(level);
  items.forEach((item) => {
    const anchor = safeLink("", item.url);
    if (!anchor) return;
    anchor.className = "evidence-item";
    anchor.append(
      node("strong", "", item.title || "查看原始证据"),
      node(
        "span",
        "",
        `${item.source || "来源未知"} · ${evidenceRole(item.role)} · ${formatDate(item.publishedAt)}`,
      ),
    );
    root.append(anchor);
  });
  if (!items.length) root.append(node("p", "empty-copy", "该事件没有可公开的原始证据链接。"));
}

function closePreview() {
  $("#detailDrawer").classList.remove("open");
  $("#drawerBackdrop").hidden = true;
  document.body.classList.remove("drawer-open");
}

function renderEvolution() {
  const root = $("#evolutionStrip");
  root.replaceChildren();
  const eras = state.narratives?.eras || [];
  if (eras.length) {
    eras.forEach((era, index) => {
      root.append(narrativeEraCard(era, index, eras.length));
    });
    const horizon = state.narratives?.horizon;
    $("#coverageNote").textContent = horizon
      ? `叙事观察窗：${horizon.start} 至 ${horizon.end}。阶段摘要属于分析，详细事实以事件证据为准。`
      : "阶段摘要属于分析，详细事实以事件证据为准。";
    return;
  }
  $("#coverageNote").textContent = "当前没有经过审核的两年阶段叙事。";
}

function narrativeEraCard(era, index, total) {
  const article = node(
    "article",
    `evolution-card narrative-era${index === total - 1 ? " current" : ""}`,
  );
  article.append(
    node("span", "evolution-period", era.period || era.label),
    node("strong", "era-index", String(index + 1).padStart(2, "0")),
    node("h3", "", era.label),
    node("p", "", era.summary),
  );
  const events = eventsForEra(era);
  const representative = [...events].sort(
    (left, right) => (right.impactScore || 0) - (left.impactScore || 0),
  )[0];
  if (representative) {
    const button = node("button", "evolution-lead");
    button.type = "button";
    button.append(
      node("b", "", representative.title),
      node("span", "", `${events.length} 个证据节点 →`),
    );
    button.addEventListener("click", () => {
      openPreview(representative, { updateHash: true, revealOnMobile: true });
      $("#timeline").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    article.append(button);
  }
  return article;
}

function eventsForEra(era) {
  const match = String(era.period || "").match(/^(\d{4})\s+(H[12]|Q[1-4])$/);
  if (!match) return [];
  const year = Number(match[1]);
  const unit = match[2];
  const startMonth = unit.startsWith("H") ? (unit === "H1" ? 0 : 6) : (Number(unit[1]) - 1) * 3;
  const span = unit.startsWith("H") ? 6 : 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + span, 1));
  return state.events.filter((event) => {
    const date = new Date(event.happenedAt);
    return date >= start && date < end;
  });
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
    toolHeading("星探机会", "证据交汇处产生的创业、内容和工作火花；它们是待验证假设，不是事实。"),
  );
  const grid = node("div", "tool-grid scout-tool-grid");
  state.scout.slice(0, 3).forEach((insight) => {
    const card = node("article", "scout-card");
    card.append(
      node("span", "", `${scoutKind(insight.kind)} · 待验证`),
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
  if (!state.scout.length) grid.append(node("p", "empty-copy", "暂无达到公开门槛的机会。"));
  root.append(grid);
}

function renderActorTool(root) {
  root.append(toolHeading("中国角色", "这里呈现已收录角色，不等同于已被持续、充分观测。"));
  const grid = node("div", "actor-tool-grid");
  state.actors
    .filter((actor) => actor.region === "CN")
    .sort((left, right) => (right.tableScore || 0) - (left.tableScore || 0))
    .slice(0, 10)
    .forEach((actor, index) => {
      const card = node("article", "actor-tool-card");
      card.append(
        node("span", "", String(index + 1).padStart(2, "0")),
        node("strong", "", actor.name),
        node("b", "", scoreBand(actor.tableScore)),
        node("small", "", `${actor.scale} · ${(actor.domains || []).slice(0, 2).join(" / ")}`),
      );
      grid.append(card);
    });
  root.append(grid);
}

function renderResourceTool(root) {
  root.append(toolHeading("模型获取", "官方入口和价格证据优先；第三方比价仅作购买前参考。"));
  const grid = node("div", "tool-grid resource-tool-grid");
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
  root.append(grid);
  const priceAi = safeLink("前往 PriceAI 做进一步比价 ↗", "https://priceai.cc");
  if (priceAi) {
    priceAi.className = "priceai-link";
    root.append(priceAi);
  }
}

function renderProductTool(root) {
  root.append(toolHeading("系统水位", "公开当前真实能力；评分来自内部评测，不等同于外部审计。"));
  if (!state.product) {
    root.append(node("p", "empty-copy", "系统评测数据暂不可用。"));
    return;
  }
  const summary = node("div", "product-summary");
  [
    ["版本", `v${state.product.version}`],
    ["来源目录", String(state.product.sourceCoverage?.total || 0)],
    ["隔离观察", String(state.product.sourceCoverage?.observing || 0)],
    ["内部评测", scoreBand(state.product.evaluation?.overallScore)],
  ].forEach(([label, value]) => {
    const item = node("div");
    item.append(node("span", "", label), node("strong", "", value));
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

function strategicTracks() {
  return TREND_PRIORITY.map((slug) => state.tracks.find((track) => track.slug === slug)).filter(
    Boolean,
  );
}

function eventsForTrack(slug) {
  return state.events.filter((event) => (event.tracks || []).some((track) => track.slug === slug));
}

function hasPrimaryEvidence(event) {
  return (event.evidence || []).some((item) => item.role === "primary");
}

function evidenceStats(event) {
  const items = event.evidence || [];
  const sources = new Set(
    items
      .map((item) =>
        String(item.source || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  return { evidenceCount: items.length, sourceCount: sources.size };
}

function evidenceLabel(event) {
  const stats = evidenceStats(event);
  if (stats.sourceCount >= 2 && hasPrimaryEvidence(event)) return "一手 + 多源佐证";
  if (stats.sourceCount >= 2) return "多源二手待确认";
  if (hasPrimaryEvidence(event)) return "单一一手来源";
  if (stats.evidenceCount) return "二手证据待补强";
  return "证据待补";
}

function evidenceStatusCopy(event) {
  const stats = evidenceStats(event);
  if (stats.sourceCount >= 2)
    return `${stats.sourceCount} 个独立来源交叉佐证，其中${hasPrimaryEvidence(event) ? "包含" : "不含"}一手来源`;
  if (hasPrimaryEvidence(event)) return "已有一手事实，但仍缺少独立来源交叉佐证";
  if (stats.evidenceCount) return "当前仅有二手证据，关键事实仍待一手来源确认";
  return "尚无可公开证据，不应据此做强判断";
}

function evidenceRole(role) {
  return { primary: "一手", secondary: "二手", amplification: "传播" }[role] || role || "来源";
}

function scoreBand(value) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 85) return "较高";
  if (value >= 70) return "中高";
  if (value >= 55) return "中等";
  return "偏低";
}

function scoutKind(kind) {
  return { venture: "创业假设", media: "内容假设", work: "工作假设" }[kind] || "认知假设";
}

function categoryName(category) {
  return (
    {
      model: "模型能力",
      research: "研究进展",
      product: "产品发布",
      commercialization: "商业化",
      investment: "资本动作",
      policy: "政策监管",
      infrastructure: "算力基础设施",
      talent: "组织人才",
    }[category] ||
    category ||
    "行业事件"
  );
}

function displayText(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (entity, decimal) => decodeCodePoint(entity, Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (entity, hexadecimal) =>
      decodeCodePoint(entity, Number.parseInt(hexadecimal, 16)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function decodeCodePoint(entity, codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return entity;
  return String.fromCodePoint(codePoint);
}

function clipText(value, limit) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
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

function eventFromHash() {
  const slug = new URLSearchParams(location.hash.slice(1)).get("event");
  return state.events.find((event) => event.slug === slug);
}

function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return `${date.getFullYear()} 年 ${String(date.getMonth() + 1).padStart(2, "0")} 月`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatCoverage(oldest, latest) {
  const months = Math.max(
    1,
    (latest.getFullYear() - oldest.getFullYear()) * 12 + latest.getMonth() - oldest.getMonth() + 1,
  );
  return months >= 12
    ? `${Math.floor(months / 12)}年${months % 12 ? `${months % 12}月` : ""}`
    : `${months}个月`;
}

function formatRelativeHours(hours) {
  if (hours === null || !Number.isFinite(hours)) return "时间未知";
  if (hours < 1) return "不到 1 小时前";
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

$("#searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTimeline();
});

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

const mobilePreview = window.matchMedia("(max-width: 820px)");
$("#drawerClose").addEventListener("click", closePreview);
$("#drawerBackdrop").addEventListener("click", closePreview);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreview();
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
