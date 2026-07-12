import type {
  EnrichedEvent,
  EvaluationDimension,
  PublicActor,
  PublicResource,
  PublicScoutInsight,
  PublicSource,
  PublicTrack,
  Release,
  StaticSiteModel,
  TrackNarrative,
} from "./dto.js";
import { escapeHtml, formatDate, icon, pageLayout, safeExternalLink } from "./render.js";

const STRATEGIC_TRACKS = [
  "tech-evolution",
  "agi-progress",
  "commercialization",
  "investing",
  "china-catch-up",
  "model-economics",
];

export interface StaticPage {
  path: string;
  content: string;
}

export function renderStaticPages(model: StaticSiteModel): StaticPage[] {
  const pages: StaticPage[] = [
    page(model, "index.html", 0, "home", "Agent Pulse · 今日 AI 行业判断", home(model)),
    page(
      model,
      "lines/index.html",
      1,
      "lines",
      "AI 行业六条主线 · Agent Pulse",
      linesOverview(model),
    ),
    page(
      model,
      "timeline/index.html",
      1,
      "timeline",
      "AI 行业证据时间轴 · Agent Pulse",
      timeline(model),
    ),
    toolPage(model, "scout", "星探机会 · Agent Pulse", scoutPage(model)),
    toolPage(model, "actors", "中国 AI 角色雷达 · Agent Pulse", actorsPage(model)),
    toolPage(model, "resources", "模型与 API 获取 · Agent Pulse", resourcesPage(model)),
    toolPage(model, "product", "能力、评测与路线图 · Agent Pulse", productPage(model)),
    page(
      model,
      "changelog/index.html",
      1,
      "changelog",
      "Changelog · Agent Pulse",
      changelogPage(model),
    ),
    page(
      model,
      "sources/index.html",
      1,
      "sources",
      "AI 信息来源地图 · Agent Pulse",
      sourcesPage(model),
    ),
    page(model, "legal/index.html", 1, "legal", "版权与来源政策 · Agent Pulse", legalPage(model)),
  ];

  for (const track of strategicTracks(model)) {
    pages.push(
      page(
        model,
        `lines/${track.slug}/index.html`,
        2,
        "lines",
        `${track.name}主线 · Agent Pulse`,
        lineDetail(model, track),
      ),
    );
  }
  for (const event of model.events) {
    pages.push(
      page(
        model,
        `events/${event.slug}/index.html`,
        2,
        "timeline",
        `${event.title} · Agent Pulse`,
        eventPage(model, event),
        event.factSummary,
      ),
    );
  }

  pages.push({ path: "404.html", content: notFoundPage(model) });
  return pages;
}

function page(
  model: StaticSiteModel,
  path: string,
  depth: number,
  active: Parameters<typeof pageLayout>[0]["active"],
  title: string,
  body: string,
  description = "用一手证据、六条主线和两年时间轴理解 AI 行业变化。",
): StaticPage {
  const route = path === "index.html" ? "/" : `/${path.replace(/index\.html$/, "")}`;
  return {
    path,
    content: pageLayout({
      title,
      description: clip(description, 155),
      route,
      depth,
      active,
      body,
      siteUrl: model.siteUrl,
      github: model.github,
      generatedAt: model.generatedAt,
    }),
  };
}

function toolPage(model: StaticSiteModel, route: string, title: string, body: string): StaticPage {
  return page(
    model,
    `${route}/index.html`,
    1,
    route as "scout" | "actors" | "resources" | "product",
    title,
    body,
  );
}

function home(model: StaticSiteModel): string {
  const lead = leadEvent(model.events);
  const recent = model.events.filter(hasPrimaryEvidence).slice(0, 5);
  const releases = model.product.releases.slice(0, 2);
  const stars = model.github.stars === null ? "公开构建" : `${model.github.stars} Stars`;
  const today = lead
    ? `<article class="today-card reveal">
        <div class="today-main">
          <div class="eyebrow"><span class="live-dot"></span>TODAY · ${escapeHtml(formatDate(lead.happenedAt))} · ${escapeHtml(lead.company || "主体未知")}</div>
          <h1>${escapeHtml(lead.title)}</h1>
          <section class="fact-block"><span>已核验事实</span><p>${escapeHtml(lead.factSummary)}</p></section>
          <div class="evidence-line"><span class="evidence-badge">${escapeHtml(evidenceLabel(lead))}</span><span>${lead.evidence.length} 条证据 · ${evidenceSourceCount(lead)} 个独立来源</span></div>
          <div class="today-actions">
            <a class="button primary" href="__PREFIX__events/${escapeHtml(lead.slug)}/">核验证据 ${icon("arrow-right")}</a>
            <a class="button quiet" href="__PREFIX__timeline/?event=${escapeHtml(lead.slug)}">在时间轴中查看</a>
          </div>
        </div>
        <aside class="decision-lenses" aria-label="决策判断">
          ${lens("为什么重要", lead.industryInsight || lead.summary, "analysis")}
          ${lens("影响谁", lead.businessValue, "impact")}
          ${lens("接下来观察", lead.futureOutlook, "forecast")}
        </aside>
      </article>`
    : emptyState("今天暂无达到公开门槛的一手事件。", "系统不会用低质量内容填满首屏。 ");

  return `<section class="today-section shell">
      <header class="today-heading"><div><span class="section-kicker">30-SECOND BRIEF</span><h2>今天，先判断这件事</h2></div><p>事实、分析与预测分开呈现。先得到可复述的判断，再决定是否下钻。</p></header>
      ${today}
      ${coverageBar(model)}
    </section>

    <section class="section shell" aria-labelledby="lines-title">
      ${sectionHead("01 / STRATEGIC LINES", "六条主线", "每条主线只提炼当前判断、最近转折与下一观察。")}
      <div class="line-summary-grid">${strategicTracks(model)
        .map((track) => lineSummary(model, track))
        .join("")}</div>
    </section>

    <section class="section section-tint" aria-labelledby="evidence-title"><div class="shell">
      ${sectionHead("02 / RECENT EVIDENCE", "最近证据", "只显示含一手来源的近期节点，完整筛选与详情在时间轴。")}
      <div class="recent-evidence">${recent.map(eventRow).join("")}</div>
      <a class="text-link" href="__PREFIX__timeline/">打开完整证据时间轴 ${icon("arrow-right")}</a>
    </div></section>

    <section class="section shell">
      ${sectionHead("03 / DECISION TOOLS", "需要时，再向下钻", "机会、角色、购买资源与系统水位各自拥有完整页面。")}
      <div class="gateway-grid">
        ${gateway("sparkles", "星探机会", `${model.scout.length} 条待验证假设`, "把变化转成创业、内容与工作实验。", "scout/")}
        ${gateway("users", "角色雷达", `${model.actors.length} 个角色`, "区分已收录、有效观测与证据绑定。", "actors/")}
        ${gateway("box", "模型获取", `${model.resources.length} 个购买入口`, "价格、单位、核验时间与风险同屏。", "resources/")}
        ${gateway("gauge", "系统水位", `${model.product.capabilities.length} 项能力`, "公开能力、评测惩罚和 State 1–5。", "product/")}
      </div>
    </section>

    <section class="section shell">
      ${sectionHead("04 / PRODUCT EVOLUTION", "最近发生了哪些变化", "Changelog 只提炼用户能感知的能力增量，不做新闻 ticker。")}
      <div class="release-preview-grid">${releases.map(releasePreview).join("")}</div>
      <a class="text-link" href="__PREFIX__changelog/">查看完整产品演进 ${icon("arrow-right")}</a>
    </section>

    <section class="github-cta shell reveal">
      <div>${icon("github")}<span>OPEN INTELLIGENCE INFRASTRUCTURE</span><h2>让证据链继续生长</h2><p>查看实现、提出来源、纠正事实，或用一个 Star 让更多人发现这个项目。</p></div>
      <div class="github-stats"><strong>${escapeHtml(stars)}</strong><span>${escapeHtml(model.product.version)} · ${escapeHtml(formatDate(model.generatedAt))}</span><a class="button primary" href="${escapeHtml(model.github.repositoryUrl)}" target="_blank" rel="noopener noreferrer">Star on GitHub ${icon("star")}</a></div>
    </section>

    <section class="manifesto section-tint"><div class="shell">
      <span>AGENT PULSE</span><h2>别追每条新闻。<em>看清变化的方向。</em></h2><p>从一手事实出发，沿技术、AGI、商业、资本与中国追赶主线，找到真正会改变决策的行业转折。</p>
      <div class="principles"><span>一手来源优先</span><span>事实 / 分析 / 预测分层</span><span>证据可追溯</span></div>
    </div></section>`;
}

function linesOverview(model: StaticSiteModel): string {
  return `<section class="page-hero shell">
      <span class="section-kicker">STRATEGIC LINES</span><h1>六条主线，不是六个标签</h1><p>从当前判断进入阶段、转折和证据节点。每条主线共享同一批事实，但回答不同的决策问题。</p>
      ${pageStatus(`${model.events.length} 个公开事件`, `${model.narratives.horizon.label}观察窗`, "选择一条主线开始")}
    </section>
    <section class="section shell"><div class="line-directory">${strategicTracks(model)
      .map((track) => lineDirectoryCard(model, track))
      .join("")}</div></section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("HOW TO READ", "同一事实，沿不同视角理解", "技术变化会传导到产品、商业、资本与中国相对位置。")}
      <div class="reading-flow"><span>技术能力</span>${icon("arrow-right")}<span>产品阈值</span>${icon("arrow-right")}<span>商业验证</span>${icon("arrow-right")}<span>资本与竞争</span></div>
    </div></section>`;
}

function lineDetail(model: StaticSiteModel, track: PublicTrack): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  const primaryEvents = events.filter(hasPrimaryEvidence);
  const lead = primaryEvents[0] || events[0];
  const roleEvents = primaryEvents.slice(0, 4);
  const gap =
    events.length >= 8
      ? "公开节点已形成连续骨架，但多源交叉验证仍需继续补强。"
      : `当前只有 ${events.length} 个公开节点，仍属于证据稀疏主线。`;
  return `<section class="line-hero shell" style="--track-color:${escapeHtml(track.color)}">
      <nav class="line-nav" aria-label="六条主线">${strategicTracks(model)
        .map(
          (item) =>
            `<a href="__PREFIX__lines/${escapeHtml(item.slug)}/"${item.slug === track.slug ? ' aria-current="page"' : ""}>${escapeHtml(item.name)}</a>`,
        )
        .join("")}</nav>
      <div class="line-hero-grid"><div><span class="section-kicker">${escapeHtml(track.perspective.toUpperCase())} · ${events.length} EVIDENCE NODES</span><h1>${escapeHtml(track.name)}</h1><p class="line-now">${escapeHtml(narrative?.now || track.description)}</p></div>
      <aside><span>当前判断 · 系统分析</span><strong>${escapeHtml(narrative?.thesis || track.description)}</strong><div><span>下一观察 · 待验证</span><p>${escapeHtml(narrative?.next || "等待能改变当前判断的一手证据。")}</p></div></aside></div>
      ${pageStatus(`${primaryEvents.length}/${events.length} 含一手证据`, model.narratives.horizon.label, "沿阶段核验证据")}
    </section>
    <section class="section shell">
      ${sectionHead("01 / PHASES", "阶段轨迹", "阶段摘要属于分析；具体事实以事件证据为准。")}
      <div class="phase-rail">${(narrative?.stages || []).map(phaseCard).join("") || emptyState("当前主线尚无阶段叙事。", "")}</div>
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("02 / EVIDENCE SPINE", "证据如何累积", `${events.length} 个公开节点，优先展示一手事实。`)}
      <div class="evidence-spine">${primaryEvents.slice(0, 7).map(eventRow).join("") || emptyState("暂无一手证据节点。", "")}</div>
      <a class="text-link" href="__PREFIX__timeline/?track=${escapeHtml(track.slug)}">在时间轴查看全部节点 ${icon("arrow-right")}</a>
    </div></section>
    <section class="section shell">
      ${sectionHead("03 / DECISION LENSES", "四种角色，四个问题", "以下判断来自本主线公开事件，不替代独立决策。")}
      <div class="role-grid">
        ${roleLens("CEO", "这会改变哪个控制点？", roleEvents[0]?.businessValue)}
        ${roleLens("投资负责人", "价值向哪一层迁移？", roleEvents[1]?.industryInsight || lead?.industryInsight)}
        ${roleLens("技术负责人", "能力与工程边界如何变化？", roleEvents[2]?.technicalInsight || lead?.technicalInsight)}
        ${roleLens("产品负责人", "下一验证信号是什么？", roleEvents[3]?.futureOutlook || lead?.futureOutlook)}
      </div>
    </section>
    <section class="section section-tint"><div class="shell two-column-note">
      <article><span class="section-kicker">CHINA / GLOBAL</span><h2>中国与全球位置</h2>${(narrative?.stages || []).map((stage) => `<p><strong>${escapeHtml(stage.period)}</strong>${escapeHtml(stage.chinaPosition)}</p>`).join("") || `<p>${escapeHtml("当前没有经过审核的同维度对比。")}</p>`}</article>
      <article class="gap-card"><span class="section-kicker">EVIDENCE GAP</span><h2>系统还不知道什么</h2><p>${escapeHtml(gap)}</p><p>缺口不会被空泛判断填满；新结论需要一手来源或相互独立的二手佐证。</p><a class="text-link" href="__PREFIX__sources/">查看来源地图 ${icon("arrow-right")}</a></article>
    </div></section>`;
}

function timeline(model: StaticSiteModel): string {
  const selected = model.events.find(hasPrimaryEvidence) || model.events[0];
  const filters = strategicTracks(model)
    .map(
      (track) =>
        `<button type="button" data-filter-track="${escapeHtml(track.slug)}">${escapeHtml(track.name)}</button>`,
    )
    .join("");
  return `<section class="page-hero compact shell">
      <span class="section-kicker">EVIDENCE TIMELINE</span><h1>沿时间，看证据如何累积</h1><p>列表用于扫读，预览用于核验。系统分数只用于排序，不代表客观真值。</p>
      ${pageStatus(`${model.events.length} 个公开事件`, `${model.events.filter(hasPrimaryEvidence).length} 个含一手证据`, "搜索或选择主线")}
    </section>
    <section class="timeline-shell shell" data-timeline>
      <div class="timeline-controls">
        <label class="search-box">${icon("search")}<input type="search" data-timeline-search placeholder="搜索主体、技术、事件或关键词" autocomplete="off"></label>
        <div class="chip-row" aria-label="时间轴筛选"><button class="active" type="button" data-filter-track="all">全部</button><button type="button" data-filter-track="primary">一手证据</button>${filters}</div>
        <span data-result-count>${model.events.length} 个节点</span>
      </div>
      <div class="timeline-workbench">
        <div class="timeline-list">${model.events.map(timelineCard).join("")}</div>
        <aside class="timeline-preview" aria-live="polite">
          <button class="preview-close" type="button" data-preview-close aria-label="关闭预览">${icon("x")}</button>
          ${model.events.map((event) => eventPreview(event, event.slug !== selected?.slug)).join("")}
        </aside>
      </div>
    </section><div class="preview-backdrop" data-preview-backdrop hidden></div>`;
}

function eventPage(model: StaticSiteModel, event: EnrichedEvent): string {
  const related = model.events
    .filter(
      (item) =>
        item.slug !== event.slug &&
        item.tracks.some((track) => event.tracks.some((own) => own.slug === track.slug)),
    )
    .slice(0, 3);
  return `<article class="event-page shell">
      <nav class="breadcrumb"><a href="__PREFIX__timeline/">证据时间轴</a><span>/</span><span>${escapeHtml(categoryName(event.category))}</span></nav>
      <header class="event-header"><div><span class="section-kicker">${escapeHtml(formatDate(event.happenedAt))} · ${escapeHtml(event.company || "主体未知")}</span><h1>${escapeHtml(event.title)}</h1><div class="event-tags">${event.tracks.length ? event.tracks.map((track) => `<a href="__PREFIX__lines/${escapeHtml(track.slug)}/">${escapeHtml(track.name)}</a>`).join("") : '<span class="warning-tag">待编排主线</span>'}</div></div>
      <aside><span class="evidence-badge">${escapeHtml(evidenceLabel(event))}</span><strong>${event.evidence.length} 条证据</strong><p>${evidenceSourceCount(event)} 个独立来源</p></aside></header>
      <section class="event-fact"><span>事实陈述</span><p>${escapeHtml(event.factSummary)}</p></section>
      <div class="event-body">
        <div class="event-insights">
          ${insight("分析摘要", event.summary, "analysis")}
          ${insight("技术判断", event.technicalInsight, "analysis")}
          ${insight("行业影响", event.industryInsight, "impact")}
          ${insight("决策价值", event.businessValue, "impact")}
          ${insight("接下来观察", event.futureOutlook, "forecast")}
        </div>
        <aside class="event-sidebar">
          <section><h2>系统估计</h2><div class="score-grid">${score("可信度", event.confidenceScore)}${score("传播热度", event.heatScore)}${score("行业影响", event.impactScore)}${score("决策价值", event.valueScore)}</div><p class="fine-print">用于排序，不代表客观真值。</p></section>
          <section><h2>原始证据</h2>${evidenceLinks(event)}</section>
          <section><h2>相关角色</h2><div class="tag-list">${event.actors.map((actor) => `<span>${escapeHtml(actor.name)} · ${escapeHtml(actor.progressStage)}</span>`).join("") || "<span>暂无角色关联</span>"}</div></section>
        </aside>
      </div>
    </article>
    <section class="section section-tint"><div class="shell">${sectionHead("RELATED", "继续沿主线阅读", "相邻事件共享主线，但事实和证据保持独立。")}
      <div class="related-grid">${related.map(eventCompact).join("") || emptyState("暂无相关公开事件。", "")}</div></div></section>`;
}

function scoutPage(model: StaticSiteModel): string {
  return `${toolHeader("sparkles", "星探机会", "把行业变化转成可以在 7–30 天验证的创业、内容与工作实验。", `${model.scout.length} 条公开假设`, "假设，不是事实")}
    <section class="section shell"><div class="tool-tabs">${toolTabs("scout")}</div><div class="filter-toolbar"><button class="active" data-card-filter="all">全部</button><button data-card-filter="venture">创业</button><button data-card-filter="media">内容</button><button data-card-filter="work">工作</button></div>
    <div class="scout-grid" data-filter-grid>${model.scout.map(scoutCard).join("") || emptyState("暂无达到公开门槛的机会假设。", "")}</div></section>`;
}

function actorsPage(model: StaticSiteModel): string {
  const cn = model.actors.filter((actor) => actor.region === "CN").length;
  return `${toolHeader("users", "AI 角色雷达", "角色已收录不等于已被持续观测；所有位置判断都应回到事件证据。", `${model.actors.length} 个角色`, `${cn} 个中国角色`)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("actors")}</div><div class="filter-toolbar"><button class="active" data-card-filter="all">全部</button><button data-card-filter="CN">中国</button><button data-card-filter="GLOBAL">全球</button><button data-card-filter="US">美国</button></div>
    <div class="actor-grid" data-filter-grid>${[...model.actors]
      .sort((a, b) => b.tableScore - a.tableScore)
      .map(actorCard)
      .join("")}</div></section>`;
}

function resourcesPage(model: StaticSiteModel): string {
  return `${toolHeader("box", "模型与 API 获取", "把价格、单位、核验时点和官方入口放在一起；第三方比价只作参考。", `${model.resources.length} 个资源`, "购买前重新核验")}
    <section class="section shell"><div class="tool-tabs">${toolTabs("resources")}</div><div class="resource-grid">${model.resources.map(resourceCard).join("")}</div><p class="legal-note">价格代表页面标注的核验时点，不构成采购、投资或财务建议。</p></section>`;
}

function productPage(model: StaticSiteModel): string {
  const evaluation = model.product.evaluation;
  const domains = [...new Set(model.product.capabilities.map((item) => item.domain))];
  return `${toolHeader("gauge", "系统能力与水位", "不只展示总分，也展示样本不足、硬上限、惩罚和下一步。", evaluation ? `${evaluation.overallScore}/100 校准分` : "评测待生成", `${model.product.capabilities.length} 项能力`)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("product")}</div>
      <div class="product-metrics">${metric("版本", `v${model.product.version}`)}${metric("来源目录", model.product.sourceCoverage.total)}${metric("E3 观察", model.product.sourceCoverage.observing)}${metric("证据覆盖", evaluation ? `${evaluation.evidenceCoverage}%` : "—")}</div>
      ${sectionHead("01 / EVALUATION", "评测不是漂亮数字", "raw、校准分、样本和惩罚同时公开。")}
      <div class="evaluation-grid">${(evaluation?.dimensions || []).map(evaluationCard).join("") || emptyState("暂无评测结果。", "")}</div>
      ${sectionHead("02 / CAPABILITY MAP", "能力图谱", "operational、experimental 与 planned 明确分层。")}
      ${domains
        .map(
          (domain) =>
            `<section class="capability-domain"><h3>${escapeHtml(domain)}</h3><div class="capability-grid">${model.product.capabilities
              .filter((item) => item.domain === domain)
              .map(
                (item) =>
                  `<article><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span><h4>${escapeHtml(item.name)}</h4><div class="maturity"><i style="width:${Math.max(0, Math.min(100, item.maturity))}%"></i></div><p>${escapeHtml(item.evidence)}</p><small>${item.maturity}/100 · ${escapeHtml(item.release)}</small></article>`,
              )
              .join("")}</div></section>`,
        )
        .join("")}
      ${sectionHead("03 / STATE 1–5", "未来如何生长", "每个 State 都有明确承诺和里程碑。")}
      <div class="roadmap-grid">${model.product.roadmap.map((stage) => `<article><span>STATE ${stage.state} · ${escapeHtml(stage.status)}</span><h3>${escapeHtml(stage.name)}</h3><p>${escapeHtml(stage.promise)}</p><ul>${stage.milestones.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`).join("")}</div>
    </section>`;
}

function changelogPage(model: StaticSiteModel): string {
  return `<section class="page-hero shell"><span class="section-kicker">PRODUCT EVOLUTION</span><h1>Changelog</h1><p>每个版本都回答：用户获得了什么、能力如何增长、哪些指标发生变化。</p>${pageStatus(`${model.product.releases.length} 个版本`, `当前 v${model.product.version}`, "沿版本轨道回看")}</section>
    <section class="section shell"><div class="changelog-rail">${model.product.releases.map((release, index) => releaseDetail(release, index === 0)).join("")}</div></section>`;
}

function sourcesPage(model: StaticSiteModel): string {
  const coverage = model.product.sourceCoverage;
  return `<section class="page-hero shell"><span class="section-kicker">SOURCE MAP</span><h1>来源是系统的一等资产</h1><p>目录、可访问、健康、隔离观察与生产来源是不同水位。这里公开身份和治理状态，不公开内部错误与代理信息。</p>${pageStatus(`${coverage.total} 个目录源`, `${coverage.observing} 个 E3 观察`, `${coverage.active} 个 E4 active`)}</section>
    <section class="section shell">
      <div class="source-standard">${sourceLevel("E0", "Catalog", "有身份与端点")}${sourceLevel("E1", "Reachable", "当前可访问")}${sourceLevel("E2", "Healthy", "合法内容与质量门槛")}${sourceLevel("E3", "Observing", "隔离采集，不进公开事实")}${sourceLevel("E4", "Production", "长期验证 + 人工确认")}</div>
      <div class="source-toolbar"><label class="search-box">${icon("search")}<input data-source-search type="search" placeholder="搜索来源、地区、类型"></label><div class="chip-row"><button class="active" data-source-filter="all">全部</button><button data-source-filter="active">Active</button><button data-source-filter="observing">E3 观察</button><button data-source-filter="CN">中国</button></div></div>
      <div class="source-table" data-source-grid>${model.sources.map(sourceRow).join("")}</div>
      <div class="contribute-card"><div>${icon("git-pull-request")}<h2>发现值得长期观测的来源？</h2><p>Proposal 会经过 URL 安全、重复、许可、fixture、shadow 与人工晋级门禁；Issue 不会直接激活来源。</p></div><a class="button primary" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">提出来源建议 ${icon("arrow-right")}</a></div>
    </section>`;
}

function legalPage(model: StaticSiteModel): string {
  return `<section class="page-hero shell"><span class="section-kicker">COPYRIGHT & SOURCE POLICY</span><h1>尊重来源，也保护判断的可验证性</h1><p>Agent Pulse 发布必要 metadata、有限短摘录和原创分析，不镜像第三方正文。</p>${pageStatus("代码 MIT", "第三方权利保留", "可纠错、署名或下架")}</section>
    <section class="section shell legal-layout">
      <nav class="legal-nav"><a href="#scope">许可边界</a><a href="#sources">来源与引用</a><a href="#correction">纠错与下架</a><a href="#disclaimer">免责声明</a><a href="#icons">图标许可</a></nav>
      <div class="legal-copy">
        <section id="scope"><span>01</span><h2>代码与内容许可分开</h2><p>仓库中的源代码和明确标记的项目自有文档适用仓库 LICENSE。第三方标题、论文、新闻、博客、Release、商标、Logo 与其他材料的权利归各自权利人；MIT 不授予第三方内容使用权。</p></section>
        <section id="sources"><span>02</span><h2>只保留理解所需的最小内容</h2><p>公开事件使用原创事实摘要与分析，并回链 canonical source。来源全文、付费内容、登录后内容、cookie、原始 payload 和内部样本不会进入 Pages。</p></section>
        <section id="correction"><span>03</span><h2>纠错、署名与下架</h2><p>如果事实、署名、链接或版权边界存在问题，请通过 GitHub Issue 提交具体 URL、理由和可验证证据。维护者会记录修订，而不是静默覆盖历史。</p><a class="button quiet" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">提交纠错或下架请求</a></section>
        <section id="disclaimer"><span>04</span><h2>不是投资、采购或法律建议</h2><p>评分是系统估计，预测和机会是假设。模型价格、来源状态与行业判断只代表标注时点，使用者应核验原始证据并独立决策。</p></section>
        <section id="icons"><span>05</span><h2>本地图标与第三方资产</h2><p>界面图标使用本地 vendoring 的 Lucide 子集，许可与版本说明随静态资产一同发布。站点不在运行时加载远程 iconfont 或网络 SVG。</p><a class="text-link" href="__PREFIX__assets/THIRD_PARTY_NOTICES.txt">查看第三方许可说明 ${icon("arrow-right")}</a></section>
      </div>
    </section>`;
}

function notFoundPage(model: StaticSiteModel): string {
  return pageLayout({
    title: "页面未找到 · Agent Pulse",
    description: "这个页面不存在或已经移动。",
    route: "/404.html",
    depth: 0,
    active: "home",
    body: `<section class="not-found shell"><span>404</span><h1>这条信号不在公开时间轴</h1><p>页面可能已经移动、合并或撤回。你可以回到今日判断，或沿主线继续阅读。</p><div><a class="button primary" href="./">返回首页</a><a class="button quiet" href="./lines/">六条主线</a><a class="button quiet" href="./timeline/">证据时间轴</a></div></section>`,
    siteUrl: model.siteUrl,
    github: model.github,
    generatedAt: model.generatedAt,
  });
}

function toolHeader(
  iconName: string,
  title: string,
  copy: string,
  state: string,
  action: string,
): string {
  return `<section class="tool-hero shell"><div>${icon(iconName)}<span class="section-kicker">DECISION TOOL</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div>${pageStatus(state, action, "选择筛选开始")}</section>`;
}

function toolTabs(active: string): string {
  const tabs = [
    ["scout", "星探机会"],
    ["actors", "角色雷达"],
    ["resources", "模型获取"],
    ["product", "系统水位"],
  ];
  return tabs
    .map(
      ([route, label]) =>
        `<a href="__PREFIX__${route}/"${route === active ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
}

function coverageBar(model: StaticSiteModel): string {
  const primary = model.events.filter(hasPrimaryEvidence).length;
  const multi = model.events.filter(
    (event) => hasPrimaryEvidence(event) && evidenceSourceCount(event) >= 2,
  ).length;
  return `<div class="coverage-bar">${metric("一手覆盖", model.events.length ? `${Math.round((primary / model.events.length) * 100)}%` : "—")}${metric("公开事件", model.events.length)}${metric("一手 + 多源", multi)}${metric("观察跨度", model.narratives.horizon.label)}</div>`;
}

function pageStatus(left: string, middle: string, right: string): string {
  return `<div class="page-status"><span>${escapeHtml(left)}</span><span>${escapeHtml(middle)}</span><span>${escapeHtml(right)}</span></div>`;
}

function sectionHead(kicker: string, title: string, copy: string): string {
  return `<header class="section-head"><div><span class="section-kicker">${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2></div><p>${escapeHtml(copy)}</p></header>`;
}

function lens(label: string, copy: string, kind: string): string {
  return `<section class="decision-lens ${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><p>${escapeHtml(copy || "暂无经过审核的判断。")}</p></section>`;
}

function lineSummary(model: StaticSiteModel, track: PublicTrack): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  const latest = events[0];
  return `<article class="line-summary" style="--track-color:${escapeHtml(track.color)}"><div><span>${escapeHtml(track.name)} · ${events.length} 节点</span><h3>${escapeHtml(narrative?.now || track.description)}</h3><p>${escapeHtml(narrative?.thesis || track.description)}</p></div><footer><span>${latest ? `最新 · ${formatDate(latest.happenedAt)}` : "证据待补"}</span><a href="__PREFIX__lines/${escapeHtml(track.slug)}/">打开主线 ${icon("arrow-right")}</a></footer></article>`;
}

function lineDirectoryCard(model: StaticSiteModel, track: PublicTrack): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  return `<a class="line-directory-card" href="__PREFIX__lines/${escapeHtml(track.slug)}/" style="--track-color:${escapeHtml(track.color)}"><span>${escapeHtml(track.perspective)} · ${events.length} 节点</span><h2>${escapeHtml(track.name)}</h2><p>${escapeHtml(narrative?.now || track.description)}</p><div><strong>下一观察</strong><small>${escapeHtml(narrative?.next || "等待新证据")}</small></div></a>`;
}

function gateway(
  iconName: string,
  title: string,
  stat: string,
  copy: string,
  route: string,
): string {
  return `<a class="gateway-card" href="__PREFIX__${escapeHtml(route)}"><div>${icon(iconName)}<span>${escapeHtml(stat)}</span></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p><strong>进入工具 ${icon("arrow-right")}</strong></a>`;
}

function releasePreview(release: Release): string {
  return `<article class="release-preview"><span>v${escapeHtml(release.version)} · ${escapeHtml(release.date)}</span><h3>${escapeHtml(release.name)}</h3><p>${escapeHtml(release.summary)}</p><ul>${release.changes
    .slice(0, 3)
    .map((change) => `<li>${escapeHtml(change)}</li>`)
    .join("")}</ul></article>`;
}

function phaseCard(stage: {
  period: string;
  label: string;
  summary: string;
  chinaPosition: string;
}): string {
  return `<article><span>${escapeHtml(stage.period)}</span><h3>${escapeHtml(stage.label)}</h3><p>${escapeHtml(stage.summary)}</p><div><strong>中国位置</strong><p>${escapeHtml(stage.chinaPosition)}</p></div></article>`;
}

function roleLens(role: string, question: string, answer?: string): string {
  return `<article><span>${escapeHtml(role)}</span><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer || "当前证据不足，暂不形成强判断。")}</p></article>`;
}

function eventRow(event: EnrichedEvent): string {
  return `<a class="event-row" href="__PREFIX__events/${escapeHtml(event.slug)}/"><time>${escapeHtml(formatDate(event.happenedAt))}</time><div><span>${escapeHtml(event.company || "主体未知")} · ${escapeHtml(event.tracks[0]?.name || "待编排")}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></div><small>${escapeHtml(evidenceLabel(event))}</small>${icon("arrow-right")}</a>`;
}

function timelineCard(event: EnrichedEvent): string {
  const search = [event.title, event.company, event.factSummary, ...event.keywords]
    .join(" ")
    .toLowerCase();
  const tracks = event.tracks.map((track) => track.slug).join(" ");
  return `<button class="timeline-card" type="button" data-event="${escapeHtml(event.slug)}" data-search="${escapeHtml(search)}" data-tracks="${escapeHtml(tracks)}" data-primary="${hasPrimaryEvidence(event)}"><span>${escapeHtml(formatDate(event.happenedAt))} · ${escapeHtml(event.company || "主体未知")}</span><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.factSummary)}</p><footer><span>${escapeHtml(event.tracks[0]?.name || "待编排")}</span><strong>${escapeHtml(evidenceLabel(event))}</strong></footer></button>`;
}

function eventPreview(event: EnrichedEvent, hidden: boolean): string {
  return `<article data-event-panel="${escapeHtml(event.slug)}"${hidden ? " hidden" : ""}><span class="section-kicker">${escapeHtml(categoryName(event.category))} · ${escapeHtml(formatDate(event.happenedAt))}</span><h2>${escapeHtml(event.title)}</h2><section class="preview-fact"><span>事实</span><p>${escapeHtml(event.factSummary)}</p></section><div class="evidence-line"><span class="evidence-badge">${escapeHtml(evidenceLabel(event))}</span><span>${event.evidence.length} 条证据</span></div>${insight("为什么重要", event.industryInsight || event.summary, "analysis")}${insight("影响谁", event.businessValue, "impact")}${insight("下一观察", event.futureOutlook, "forecast")}<div class="preview-actions"><a class="button primary" href="__PREFIX__events/${escapeHtml(event.slug)}/">打开完整事件</a>${firstEvidenceLink(event)}</div></article>`;
}

function firstEvidenceLink(event: EnrichedEvent): string {
  const url = safeExternalLink(event.evidence[0]?.url);
  return url
    ? `<a class="button quiet" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">原始证据 ${icon("external-link")}</a>`
    : "";
}

function insight(label: string, copy: string, kind: string): string {
  return `<section class="insight ${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><p>${escapeHtml(copy || "暂无经过审核的判断。")}</p></section>`;
}

function score(label: string, value: number): string {
  return `<div><strong>${escapeHtml(scoreBand(value))}</strong><span>${escapeHtml(label)}</span><small>${value}/100</small></div>`;
}

function evidenceLinks(event: EnrichedEvent): string {
  return event.evidence
    .map((evidence) => {
      const url = safeExternalLink(evidence.url);
      return url
        ? `<a class="evidence-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(evidence.title)}</strong><span>${escapeHtml(evidence.source)} · ${escapeHtml(evidenceRole(evidence.role))} · ${escapeHtml(formatDate(evidence.publishedAt))}</span>${icon("external-link")}</a>`
        : "";
    })
    .join("");
}

function eventCompact(event: EnrichedEvent): string {
  return `<a href="__PREFIX__events/${escapeHtml(event.slug)}/"><span>${escapeHtml(formatDate(event.happenedAt))}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></a>`;
}

function scoutCard(insight: PublicScoutInsight): string {
  return `<article class="scout-card" data-filter-value="${escapeHtml(insight.kind)}"><header><span>${escapeHtml(scoutKind(insight.kind))} · ${escapeHtml(insight.horizon)}</span><strong>${insight.totalScore}/100</strong></header><h2>${escapeHtml(insight.title)}</h2><p class="hypothesis">${escapeHtml(insight.hypothesis)}</p><div class="scout-sections"><section><span>为什么现在</span><p>${escapeHtml(insight.whyNow)}</p></section><section><span>最小动作</span><p>${escapeHtml(insight.suggestedAction)}</p></section><section><span>建议产物</span><p>${escapeHtml(insight.artifactIdea)}</p></section><section class="counter"><span>可能错在哪</span><p>${escapeHtml(insight.counterSignals)}</p></section></div><footer>${insight.evidence.map((item) => `<a href="__PREFIX__events/${escapeHtml(item.slug)}/">证据 · ${escapeHtml(item.title)}</a>`).join("")}</footer></article>`;
}

function actorCard(actor: PublicActor): string {
  const url = safeExternalLink(actor.websiteUrl);
  return `<article class="actor-card" data-filter-value="${escapeHtml(actor.region)}"><header><span>${escapeHtml(actor.region)} · ${escapeHtml(actor.type)}</span><strong>${escapeHtml(scoreBand(actor.tableScore))}</strong></header><h2>${escapeHtml(actor.name)}</h2><p>${escapeHtml(actor.scale)} · ${escapeHtml(actor.domains.join(" / ") || "领域待补")}</p><div class="observation-note">已收录角色 · 持续观测程度需回到事件证据</div>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">官方网站 ${icon("external-link")}</a>` : ""}</article>`;
}

function resourceCard(resource: PublicResource): string {
  const purchase = safeExternalLink(resource.purchaseUrl);
  const source = safeExternalLink(resource.sourceUrl);
  return `<article class="resource-card"><header><span>${escapeHtml(resource.audience)} · ${resource.riskLevel === "official" ? "官方" : "参考"}</span><strong>${escapeHtml(resource.region)}</strong></header><h2>${escapeHtml(resource.model)}</h2><p>${escapeHtml(resource.provider)} · ${escapeHtml(resource.planName)}</p><div class="price-pair"><div><span>Input</span><strong>${formatPrice(resource.inputPrice, resource.currency)}</strong></div><div><span>Output</span><strong>${formatPrice(resource.outputPrice, resource.currency)}</strong></div></div><small>${escapeHtml(resource.unit)} · 核验 ${escapeHtml(formatDate(resource.verifiedAt))}</small><footer>${purchase ? `<a href="${escapeHtml(purchase)}" target="_blank" rel="noopener noreferrer">官方入口 ${icon("external-link")}</a>` : ""}${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">价格证据 ${icon("external-link")}</a>` : ""}</footer></article>`;
}

function evaluationCard(item: EvaluationDimension): string {
  return `<article><header><span>${escapeHtml(item.status)}</span><strong>${item.score}<small>/100</small></strong></header><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><dl><div><dt>Raw</dt><dd>${item.rawScore}</dd></div><div><dt>硬上限</dt><dd>${item.scoreCap}</dd></div><div><dt>样本</dt><dd>${item.sampleSize}/${item.sampleTarget}</dd></div></dl><ul>${item.penalties.map((penalty) => `<li>${escapeHtml(penalty)}</li>`).join("")}</ul><div class="next-action"><span>下一步</span><p>${escapeHtml(item.nextAction)}</p></div></article>`;
}

function releaseDetail(release: Release, open: boolean): string {
  return `<article class="release-node" id="v${escapeHtml(release.version.replaceAll(".", "-"))}"><div class="release-marker"><i></i><span>v${escapeHtml(release.version)}</span><time>${escapeHtml(release.date)}</time></div><details${open ? " open" : ""}><summary><div><span>${open ? "LATEST RELEASE" : "RELEASE"}</span><h2>${escapeHtml(release.name)}</h2><p>${escapeHtml(release.summary)}</p></div>${icon("chevron-down")}</summary><div class="release-body"><section><h3>能力增量</h3><div class="capability-pills">${release.capabilities.map((item) => `<span>${icon("check")} ${escapeHtml(item)}</span>`).join("")}</div></section><section><h3>用户可感知变化</h3><ol>${release.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ol></section></div></details></article>`;
}

function sourceLevel(level: string, title: string, copy: string): string {
  return `<article><strong>${escapeHtml(level)}</strong><span>${escapeHtml(title)}</span><p>${escapeHtml(copy)}</p></article>`;
}

function sourceRow(source: PublicSource): string {
  const filter = `${source.region} ${source.lifecycle} ${source.observationEnabled ? "observing" : ""}`;
  const url = safeExternalLink(source.homepageUrl);
  return `<article data-source-value="${escapeHtml(filter)}" data-source-search-value="${escapeHtml([source.name, source.slug, source.region, source.category, ...source.topics].join(" ").toLowerCase())}"><div><strong>${escapeHtml(source.name)}</strong><span>${escapeHtml(source.slug)}</span></div><span>${escapeHtml(source.region)}</span><span>${escapeHtml(source.category)}</span><span>Tier ${source.tier}</span><span>${source.observationEnabled ? "E3 observing" : escapeHtml(source.lifecycle)}</span><span>${source.qualityScore}/100</span>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${escapeHtml(source.name)}">${icon("external-link")}</a>` : ""}</article>`;
}

function readingMetric(value: string | number): string {
  return escapeHtml(String(value));
}

function metric(label: string, value: string | number): string {
  return `<div><span>${escapeHtml(label)}</span><strong>${readingMetric(value)}</strong></div>`;
}

function emptyState(title: string, copy: string): string {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div>`;
}

function strategicTracks(model: StaticSiteModel): PublicTrack[] {
  return STRATEGIC_TRACKS.map((slug) => model.tracks.find((track) => track.slug === slug)).filter(
    (track): track is PublicTrack => Boolean(track),
  );
}

function narrativeFor(model: StaticSiteModel, slug: string): TrackNarrative | undefined {
  return model.narratives.tracks.find((item) => item.slug === slug);
}

function eventsForTrack(events: EnrichedEvent[], slug: string): EnrichedEvent[] {
  return events.filter((event) => event.tracks.some((track) => track.slug === slug));
}

function leadEvent(events: EnrichedEvent[]): EnrichedEvent | undefined {
  const primary = events.filter(hasPrimaryEvidence);
  const newest = Math.max(...primary.map((event) => new Date(event.happenedAt).getTime()));
  const recentWindow = primary.filter(
    (event) => newest - new Date(event.happenedAt).getTime() <= 30 * 24 * 60 * 60 * 1_000,
  );
  return [...recentWindow].sort(
    (left, right) =>
      right.valueScore - left.valueScore ||
      new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime(),
  )[0];
}

function hasPrimaryEvidence(event: EnrichedEvent): boolean {
  return event.evidence.some((evidence) => evidence.role === "primary");
}

function evidenceSourceCount(event: EnrichedEvent): number {
  return new Set(event.evidence.map((evidence) => evidence.source.trim().toLowerCase())).size;
}

function evidenceLabel(event: EnrichedEvent): string {
  const sources = evidenceSourceCount(event);
  if (sources >= 2 && hasPrimaryEvidence(event)) return "一手 + 多源佐证";
  if (sources >= 2) return "多源二手待确认";
  if (hasPrimaryEvidence(event)) return "单一一手来源";
  return event.evidence.length ? "二手证据待补强" : "证据待补";
}

function evidenceRole(role: string): string {
  return { primary: "一手", secondary: "二手", amplification: "传播" }[role] || role;
}

function scoreBand(value: number): string {
  if (value >= 85) return "较高";
  if (value >= 70) return "中高";
  if (value >= 55) return "中等";
  return "偏低";
}

function scoutKind(kind: string): string {
  return { venture: "创业假设", media: "内容假设", work: "工作假设" }[kind] || "认知假设";
}

function categoryName(category: string): string {
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

function formatPrice(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) return "按方案询价";
  return `${currency === "USD" ? "$" : `${currency} `}${value}`;
}

function clip(value: string, limit: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}
