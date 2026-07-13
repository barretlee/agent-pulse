import type {
  EnrichedEvent,
  EvaluationDimension,
  PublicActor,
  PublicInfluencer,
  PublicResource,
  PublicScoutInsight,
  PublicSource,
  PublicTrack,
  Release,
  StaticSiteModel,
  TechnologyCoverage,
  TrackNarrative,
} from "./dto.js";
import type { Locale } from "./i18n.js";
import { t } from "./i18n.js";
import {
  analyzeTechnologyCoverage,
  eventDevelopments,
  groupEventsByYearMonth,
  groupTimelineMonthItems,
  isRecentEvent,
  latestDevelopmentAt,
  recentMonthlyDensity,
  recentResearchBatches,
  sortEventsByLatestDevelopment,
} from "./intelligence.js";
import { escapeHtml, formatDate, icon, pageLayout, safeExternalLink } from "./render.js";

const STRATEGIC_TRACKS = [
  "tech-evolution",
  "agi-progress",
  "commercialization",
  "investing",
  "china-catch-up",
  "model-economics",
] as const;

export interface StaticPage {
  path: string;
  content: string;
}

const LOCALES: Locale[] = ["zh-CN", "en"];

export function renderStaticPages(model: StaticSiteModel): StaticPage[] {
  const pages: StaticPage[] = [];
  for (const locale of LOCALES) {
    pages.push(...renderPagesForLocale(model, locale));
  }
  // Single 404 at root
  pages.push({ path: "404.html", content: notFoundPage(model, "zh-CN") });
  return pages;
}

function renderPagesForLocale(model: StaticSiteModel, locale: Locale): StaticPage[] {
  const lp = locale === "en" ? "en/" : "";
  const pages: StaticPage[] = [
    page(
      model,
      `${lp}index.html`,
      0,
      "home",
      locale === "en"
        ? "Today's AI Industry Brief · Agent Pulse"
        : "今日 AI 行业判断 · Agent Pulse",
      home(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}lines/index.html`,
      1,
      "lines",
      `${t("nav.lines", locale)} · Agent Pulse`,
      linesOverview(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}timeline/index.html`,
      1,
      "timeline",
      `${t("nav.timeline", locale)} · Agent Pulse`,
      timeline(model, locale),
      locale,
    ),
    toolPage(
      model,
      "scout",
      `${t("tab.scout", locale)} · Agent Pulse`,
      scoutPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "actors",
      `${t("tab.actors", locale)} · Agent Pulse`,
      actorsPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "resources",
      `${t("tab.resources", locale)} · Agent Pulse`,
      resourcesPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "product",
      `${t("tab.product", locale)} · Agent Pulse`,
      productPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}changelog/index.html`,
      1,
      "changelog",
      `Changelog · Agent Pulse`,
      changelogPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}sources/index.html`,
      1,
      "sources",
      `${t("footer.sources", locale)} · Agent Pulse`,
      sourcesPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}legal/index.html`,
      1,
      "legal",
      `${t("footer.legal", locale)} · Agent Pulse`,
      legalPage(model, locale),
      locale,
    ),
  ];

  for (const track of strategicTracks(model)) {
    pages.push(
      page(
        model,
        `${lp}lines/${track.slug}/index.html`,
        2,
        "lines",
        `${track.name} · Agent Pulse`,
        lineDetail(model, track, locale),
        locale,
      ),
    );
  }
  for (const event of model.events) {
    pages.push(
      page(
        model,
        `${lp}events/${event.slug}/index.html`,
        2,
        "timeline",
        `${event.title} · Agent Pulse`,
        eventPage(model, event, locale),
        locale,
        event.factSummary,
        { jsonLd: eventJsonLd(event, locale) },
      ),
    );
  }

  return pages;
}

function page(
  model: StaticSiteModel,
  path: string,
  depth: number,
  active: Parameters<typeof pageLayout>[0]["active"],
  title: string,
  body: string,
  locale: Locale,
  description?: string,
  extra?: Partial<
    Pick<import("./render.js").PageChrome, "jsonLd" | "robots" | "baiduVerification">
  >,
): StaticPage {
  const route = path === "index.html" ? "/" : `/${path.replace(/index\.html$/, "")}`;
  const defaultDesc =
    locale === "en"
      ? "Understand the AI industry's most important changes, why they matter, and what to watch next."
      : "每天用 10 分钟理解 AI 行业最重要的变化、影响与下一观察。";
  return {
    path,
    content: pageLayout({
      title,
      description: clip(description ?? defaultDesc, 155),
      route,
      depth,
      active,
      body,
      locale,
      siteUrl: model.siteUrl,
      github: model.github,
      generatedAt: model.generatedAt,
      ...extra,
    }),
  };
}

function toolPage(
  model: StaticSiteModel,
  route: string,
  title: string,
  body: string,
  locale: Locale,
): StaticPage {
  const lp = locale === "en" ? "en/" : "";
  return page(
    model,
    `${lp}${route}/index.html`,
    1,
    route as "scout" | "actors" | "resources" | "product",
    title,
    body,
    locale,
  );
}

function home(model: StaticSiteModel, locale: Locale): string {
  const orderedEvents = sortEventsByLatestDevelopment(model.events);
  const lead = leadEvent(orderedEvents);
  const research = orderedEvents.filter(isReviewedResearch).slice(0, 4);
  const recent: EnrichedEvent[] = [];
  for (const candidate of orderedEvents.filter(
    (event) => event.slug !== lead?.slug && hasPrimaryEvidence(event),
  )) {
    if (isResearchEvent(candidate) && recent.some(isResearchEvent)) continue;
    recent.push(candidate);
    if (recent.length === 4) break;
  }
  const today = lead
    ? `<article class="today-card reveal">
        <div class="today-main">
          <div class="eyebrow"><span class="live-dot"></span>${t("home.today", locale)} · ${escapeHtml(formatDate(latestDevelopmentAt(lead), locale))} · ${escapeHtml(lead.company || t("home.unknownEntity", locale))}</div>
          <h1>${escapeHtml(lead.title)}</h1>
          <section class="fact-block"><span>${escapeHtml(t("home.factChecked", locale))}</span><p>${escapeHtml(lead.factSummary)}</p></section>
          <div class="evidence-line"><span class="evidence-badge">${escapeHtml(evidenceLabel(lead, locale))}</span><span>${t("home.evidenceCount", locale).replace("{count}", String(lead.evidence.length))} · ${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(lead)))}</span></div>
          <div class="today-actions">
            <a class="button primary" data-event-link="${escapeHtml(lead.slug)}" href="__PREFIX__events/${escapeHtml(lead.slug)}/">${t("home.verifyEvidence", locale)} ${icon("arrow-right")}</a>
            <a class="button quiet" href="__PREFIX__timeline/?event=${escapeHtml(lead.slug)}">${t("home.viewTimeline", locale)}</a>
          </div>
        </div>
        <aside class="decision-lenses" aria-label="${locale === "en" ? "Decision assessment" : "决策判断"}">
          ${lens(t("home.lensWhy", locale), lead.industryInsight || lead.summary, "analysis", locale)}
          ${lens(t("home.lensWho", locale), lead.businessValue, "impact", locale)}
          ${lens(t("home.lensNext", locale), lead.futureOutlook, "forecast", locale)}
        </aside>
      </article>`
    : emptyState(t("home.emptyTitle", locale), t("home.emptyDesc", locale));

  return `<section class="home-intro shell">
      <div><span class="section-kicker">${escapeHtml(t("home.promiseKicker", locale))}</span><h1>${escapeHtml(t("home.promiseTitle", locale))}</h1><p>${escapeHtml(t("home.promiseDesc", locale))}</p></div>
      <ol class="reading-journey" aria-label="${locale === "en" ? "Reading path" : "阅读路径"}">
        ${journeyStep(t("home.journey30Title", locale), t("home.journey30Desc", locale))}
        ${journeyStep(t("home.journey3Title", locale), t("home.journey3Desc", locale))}
        ${journeyStep(t("home.journey10Title", locale), t("home.journey10Desc", locale))}
      </ol>
    </section>

    <section class="today-section shell">
      <header class="today-heading"><div><span class="section-kicker">${t("home.brief", locale)}</span><h2>${escapeHtml(t("home.briefTitle", locale))}</h2></div><p>${escapeHtml(t("home.briefDesc", locale))}</p></header>
      ${today}
    </section>

    <section class="section section-tint" aria-labelledby="evidence-title"><div class="shell">
      ${sectionHead(t("home.sectionEvidence", locale), t("home.sectionEvidenceTitle", locale), t("home.sectionEvidenceDesc", locale))}
      <div class="recent-evidence">${recent.map((event) => eventRow(event, locale)).join("")}</div>
      <a class="text-link" href="__PREFIX__timeline/">${t("home.openTimeline", locale)} ${icon("arrow-right")}</a>
    </div></section>

    <section class="section shell" aria-labelledby="research-title">
      ${sectionHead(t("home.sectionResearch", locale), t("home.sectionResearchTitle", locale), t("home.sectionResearchDesc", locale))}
      <div class="research-grid">${research.map((event) => researchCard(event, locale)).join("") || emptyState(t("home.researchEmpty", locale), t("home.researchEmptyDesc", locale))}</div>
      <a class="text-link" href="__PREFIX__timeline/?track=research">${t("home.openResearch", locale)} ${icon("arrow-right")}</a>
    </section>

    <section class="section shell" aria-labelledby="lines-title">
      ${sectionHead(t("home.sectionLines", locale), t("home.sectionLinesTitle", locale), t("home.sectionLinesDesc", locale))}
      <div class="line-summary-grid">${strategicTracks(model)
        .map((track) => lineSummary(model, track, locale))
        .join("")}</div>
    </section>

    <section class="section shell">
      ${sectionHead(t("home.sectionTools", locale), t("home.sectionToolsTitle", locale), t("home.sectionToolsDesc", locale))}
      <div class="judgment-paths">
        ${gateway("clock", locale === "en" ? "Reconstruct the Event" : "还原事情如何发展", `${model.events.length} ${locale === "en" ? "event stories" : "条事件脉络"}`, locale === "en" ? "Keep every update to the same event together before drawing a conclusion." : "把同一事件的首次出现、官方更新与行业反馈放在一起，再得出结论。", "timeline/", locale)}
        ${gateway("search", locale === "en" ? "Check the Blind Spots" : "检查信息覆盖盲区", `${analyzeTechnologyCoverage(model.sources).filter((item) => item.status !== "covered").length} ${locale === "en" ? "areas need attention" : "个领域待验证或补强"}`, locale === "en" ? "See which technologies are truly monitored and which only exist in the catalog." : "看清哪些技术被持续观测，哪些只是目录中有名字。", "sources/", locale)}
        ${gateway("sparkles", t("home.gatewayScout", locale), t("home.gatewayScoutStat", locale).replace("{count}", String(model.scout.length)), t("home.gatewayScoutDesc", locale), "scout/", locale)}
      </div>
    </section>

    <section class="section section-tint"><div class="shell">
      ${sectionHead(locale === "en" ? "06 / GO DEEPER" : "06 / 继续深入", locale === "en" ? "Use the Detail You Need" : "按你的问题继续深入", locale === "en" ? "People, costs, and methodology are supporting context — not competing front-page modules." : "关键参与者、选型成本和判断方法是辅助信息，不再与今日核心变化争夺注意力。")}
      <div class="gateway-grid">
        ${gateway("users", t("home.gatewayActors", locale), t("home.gatewayActorsStat", locale).replace("{count}", String(model.actors.length)), t("home.gatewayActorsDesc", locale), "actors/", locale)}
        ${gateway("box", t("home.gatewayResources", locale), t("home.gatewayResourcesStat", locale).replace("{count}", String(model.resources.length)), t("home.gatewayResourcesDesc", locale), "resources/", locale)}
        ${gateway("gauge", t("home.gatewayProduct", locale), t("home.gatewayProductStat", locale).replace("{count}", String(model.product.capabilities.length)), t("home.gatewayProductDesc", locale), "product/", locale)}
      </div>
    </div></section>

    <section class="manifesto section-tint"><div class="shell">
      <span>AGENT PULSE</span><h2>${t("home.manifestoTitle", locale)}</h2><p>${escapeHtml(t("home.manifestoDesc", locale))}</p>
      <div class="principles"><span>${escapeHtml(t("home.principle1", locale))}</span><span>${escapeHtml(t("home.principle2", locale))}</span><span>${escapeHtml(t("home.principle3", locale))}</span></div>
    </div></section>`;
}

function linesOverview(model: StaticSiteModel, locale: Locale): string {
  return `<section class="page-hero shell">
      <span class="section-kicker">STRATEGIC LINES</span><h1>${escapeHtml(t("lines.heroTitle", locale))}</h1><p>${escapeHtml(t("lines.heroDesc", locale))}</p>
      ${pageStatus(t("lines.statusEvents", locale).replace("{count}", String(model.events.length)), model.narratives.horizon.label, t("lines.selectLine", locale))}
    </section>
    <section class="section shell"><div class="line-directory">${strategicTracks(model)
      .map((track) => lineDirectoryCard(model, track, locale))
      .join("")}</div></section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("HOW TO READ", t("lines.howTitle", locale), t("lines.howDesc", locale))}
      <div class="reading-flow"><span>${escapeHtml(t("lines.flowTech", locale))}</span>${icon("arrow-right")}<span>${escapeHtml(t("lines.flowProduct", locale))}</span>${icon("arrow-right")}<span>${escapeHtml(t("lines.flowBusiness", locale))}</span>${icon("arrow-right")}<span>${escapeHtml(t("lines.flowCapital", locale))}</span></div>
    </div></section>`;
}

function lineDetail(model: StaticSiteModel, track: PublicTrack, locale: Locale): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  const primaryEvents = events.filter(hasPrimaryEvidence);
  const lead = primaryEvents[0] || events[0];
  const roleEvents = primaryEvents.slice(0, 4);
  const gap =
    events.length >= 8
      ? t("lines.dense", locale)
      : t("lines.sparse", locale).replace("{count}", String(events.length));
  return `<section class="line-hero shell" style="--track-color:${escapeHtml(track.color)}">
      <nav class="line-nav" aria-label="${escapeHtml(t("lines.navAria", locale))}">${strategicTracks(
        model,
      )
        .map(
          (item) =>
            `<a href="__PREFIX__lines/${escapeHtml(item.slug)}/"${item.slug === track.slug ? ' aria-current="page"' : ""}>${escapeHtml(item.name)}</a>`,
        )
        .join("")}</nav>
      <div class="line-hero-grid"><div><span class="section-kicker">${escapeHtml(track.perspective.toUpperCase())} · ${t("lines.evidenceNodes", locale).replace("{count}", String(events.length))}</span><h1>${escapeHtml(track.name)}</h1><p class="line-now">${escapeHtml(narrative?.now || track.description)}</p></div>
      <aside><span>${escapeHtml(t("lines.judgmentLabel", locale))}</span><strong>${escapeHtml(narrative?.thesis || track.description)}</strong><div><span>${escapeHtml(t("lines.nextLabel", locale))}</span><p>${escapeHtml(narrative?.next ?? t("lines.waitingNext", locale))}</p></div></aside></div>
      ${pageStatus(`${primaryEvents.length}/${events.length} ${locale === "en" ? "with primary evidence" : "含一手证据"}`, model.narratives.horizon.label, t("lines.verifyEvidence", locale))}
    </section>
    <section class="section shell">
      ${sectionHead(t("lines.phases", locale), t("lines.phasesTitle", locale), t("lines.phasesDesc", locale))}
      <div class="phase-rail">${(narrative?.stages || []).map((stage) => phaseCard(stage, locale)).join("") || emptyState(t("lines.noStages", locale), "")}</div>
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead(t("lines.evidenceSpine", locale), t("lines.evidenceSpineTitle", locale), t("lines.evidenceSpineDesc", locale).replace("{count}", String(events.length)))}
      <div class="evidence-spine">${
        primaryEvents
          .slice(0, 7)
          .map((event) => eventRow(event, locale))
          .join("") || emptyState(t("lines.noEvidence", locale), "")
      }</div>
      <a class="text-link" href="__PREFIX__timeline/?track=${escapeHtml(track.slug)}">${t("lines.viewTimeline", locale)} ${icon("arrow-right")}</a>
    </div></section>
    <section class="section shell">
      ${sectionHead(t("lines.lenses", locale), t("lines.lensesTitle", locale), t("lines.lensesDesc", locale))}
      <div class="role-grid">
        ${roleLens(t("lines.lensCEO", locale), t("lines.lensCEOQ", locale), locale, roleEvents[0]?.businessValue)}
        ${roleLens(t("lines.lensInvestor", locale), t("lines.lensInvestorQ", locale), locale, roleEvents[1]?.industryInsight || lead?.industryInsight)}
        ${roleLens(t("lines.lensCTO", locale), t("lines.lensCTOQ", locale), locale, roleEvents[2]?.technicalInsight || lead?.technicalInsight)}
        ${roleLens(t("lines.lensPM", locale), t("lines.lensPMQ", locale), locale, roleEvents[3]?.futureOutlook || lead?.futureOutlook)}
      </div>
    </section>
    <section class="section section-tint"><div class="shell two-column-note">
      <article><span class="section-kicker">${t("lines.chinaSection", locale)}</span><h2>${escapeHtml(t("lines.chinaTitle", locale))}</h2>${(narrative?.stages || []).map((stage) => `<p><strong>${escapeHtml(stage.period)}</strong>${escapeHtml(stage.chinaPosition)}</p>`).join("") || `<p>${escapeHtml(t("lines.noChinaPosition", locale))}</p>`}</article>
      <article class="gap-card"><span class="section-kicker">${t("lines.evidenceGap", locale)}</span><h2>${escapeHtml(t("lines.evidenceGapTitle", locale))}</h2><p>${escapeHtml(gap)}</p><p>${escapeHtml(t("lines.evidenceGapDesc", locale))}</p><a class="text-link" href="__PREFIX__sources/">${t("lines.openSourceMap", locale)} ${icon("arrow-right")}</a></article>
    </div></section>`;
}

function timeline(model: StaticSiteModel, locale: Locale): string {
  const events = sortEventsByLatestDevelopment(model.events);
  const chronology = groupEventsByYearMonth(events);
  const filters = strategicTracks(model)
    .map(
      (track) =>
        `<button type="button" data-filter-track="${escapeHtml(track.slug)}">${escapeHtml(track.name)}</button>`,
    )
    .join("");
  const density = recentMonthlyDensity(events, model.generatedAt);
  const researchBatches = recentResearchBatches(events, model.generatedAt);
  return `<section class="page-hero compact shell">
      <span class="section-kicker">EVIDENCE TIMELINE</span><h1>${escapeHtml(t("timeline.heroTitle", locale))}</h1><p>${escapeHtml(t("timeline.heroDesc", locale))}</p>
      ${pageStatus(t("timeline.statusEvents", locale).replace("{count}", String(events.length)), t("timeline.statusPrimary", locale).replace("{count}", String(events.filter(hasPrimaryEvidence).length)), locale === "en" ? "Newest development first" : "按最近进展倒序")}
    </section>
    <section class="timeline-intelligence shell">
      <article><span class="section-kicker">${locale === "en" ? "RECENT DENSITY" : "近三月密度"}</span><h2>${locale === "en" ? "A consistent evidence baseline" : "持续补齐，而不是只追今天"}</h2><div class="density-strip">${density.map((item) => densityItem(item, locale)).join("")}</div></article>
      <article><span class="section-kicker">${locale === "en" ? "RESEARCH CADENCE" : "论文批次状态"}</span><h2>${locale === "en" ? "Why a daily digest may be empty" : "为什么最近两天没有论文日报"}</h2><div class="research-cadence">${researchBatches.map((item) => researchBatchItem(item, locale)).join("")}</div><p>${locale === "en" ? "arXiv announces submissions five days a week. Empty weekend dates are shown as cadence, never fabricated as papers." : "arXiv 通常每周发布五天；周末空档会如实说明，系统不会为了凑日报伪造论文。"}</p></article>
    </section>
    <section class="timeline-shell shell" data-timeline>
      <div class="timeline-controls">
        <label class="search-box">${icon("search")}<input type="search" data-timeline-search placeholder="${escapeHtml(t("timeline.searchPlaceholder", locale))}" autocomplete="off"></label>
        <div class="chip-row" aria-label="${escapeHtml(t("timeline.searchLabel", locale))}"><button class="active" type="button" data-filter-track="all">${t("timeline.filterAll", locale)}</button><button type="button" data-filter-track="primary">${t("timeline.filterPrimary", locale)}</button><button type="button" data-filter-track="research">${t("timeline.filterResearch", locale)}</button>${filters}</div>
        <span data-result-count>${t("timeline.nodes", locale).replace("{count}", String(events.length))}</span>
      </div>
      <div class="timeline-chronology">${chronology.map((year) => timelineYearGroup(year, locale)).join("")}</div>
    </section>`;
}

function timelineYearGroup(
  group: ReturnType<typeof groupEventsByYearMonth>[number],
  locale: Locale,
): string {
  return `<section class="timeline-year" data-timeline-year="${group.year}"><header><span>${group.year}</span><p>${locale === "en" ? "Industry changes by month" : "按月回看行业变化"}</p></header><div>${group.months
    .map((month) => {
      const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
      const items = groupTimelineMonthItems(month.events)
        .map((item) =>
          item.kind === "research-day"
            ? researchDayGroup(item.key, item.events, locale)
            : timelineCard(item.event, locale),
        )
        .join("");
      return `<section class="timeline-month" data-timeline-month="${month.key}"><header><div><time datetime="${month.key}">${escapeHtml(label)}</time><span>${escapeHtml(t("timeline.monthEvents", locale).replace("{count}", String(month.events.length)))}</span></div><i></i></header><div class="timeline-list">${items}</div></section>`;
    })
    .join("")}</div></section>`;
}

function eventPage(model: StaticSiteModel, event: EnrichedEvent, locale: Locale): string {
  const related = model.events
    .filter(
      (item) =>
        item.slug !== event.slug &&
        item.tracks.some((track) => event.tracks.some((own) => own.slug === track.slug)),
    )
    .slice(0, 3);
  const publicLineSlugs = new Set(strategicTracks(model).map((track) => track.slug));
  return `<article class="event-page shell">
      <nav class="breadcrumb"><a href="__PREFIX__timeline/">${escapeHtml(t("event.breadcrumb", locale))}</a><span>/</span><span>${escapeHtml(categoryName(event.category, locale))}</span></nav>
      <header class="event-header"><div><span class="section-kicker">${escapeHtml(formatDate(event.happenedAt, locale))} · ${escapeHtml(event.company || t("event.unknownEntity", locale))}</span><h1>${escapeHtml(event.title)}</h1><div class="event-tags">${event.tracks.length ? event.tracks.map((track) => (publicLineSlugs.has(track.slug) ? `<a href="__PREFIX__lines/${escapeHtml(track.slug)}/">${escapeHtml(track.name)}</a>` : `<span>${escapeHtml(track.name)}</span>`)).join("") : `<span class="warning-tag">${escapeHtml(t("event.untracked", locale))}</span>`}</div></div>
      <aside><span class="evidence-badge">${escapeHtml(evidenceLabel(event, locale))}</span><strong>${t("event.evidenceCount", locale).replace("{count}", String(event.evidence.length))}</strong><p>${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(event)))}</p></aside></header>
      ${isResearchEvent(event) ? `<aside class="research-notice">${icon("search")}<div><strong>${escapeHtml(t("event.researchNoticeTitle", locale))}</strong><p>${escapeHtml(t("event.researchNoticeDesc", locale))}</p></div></aside>` : ""}
      <section class="event-fact"><span>${escapeHtml(t("event.factStatement", locale))}</span><p>${escapeHtml(event.factSummary)}</p></section>
      <section class="event-development-section">
        ${sectionHead("EVENT STORY", t("event.developmentTitle", locale), t("event.developmentDesc", locale))}
        ${eventJourney(event, locale)}
      </section>
      <div class="event-body">
        <div class="event-insights">
          ${insight(t("event.analysis", locale), event.summary, "analysis", locale)}
          ${insight(t("event.technical", locale), event.technicalInsight, "analysis", locale)}
          ${insight(t("event.industry", locale), event.industryInsight, "impact", locale)}
          ${insight(t("event.businessValue", locale), event.businessValue, "impact", locale)}
          ${insight(t("event.watchNext", locale), event.futureOutlook, "forecast", locale)}
        </div>
        <aside class="event-sidebar">
          <section><h2>${escapeHtml(t("event.estimates", locale))}</h2><div class="score-grid">${score(t("event.credibility", locale), event.confidenceScore, locale)}${score(t("event.heat", locale), event.heatScore, locale)}${score(t("event.impact", locale), event.impactScore, locale)}${score(t("event.value", locale), event.valueScore, locale)}</div><p class="fine-print">${escapeHtml(t("event.scoreDisclaimer", locale))}</p></section>
          <section><h2>${escapeHtml(t("event.evidence", locale))}</h2>${evidenceLinks(event, locale)}</section>
          <section><h2>${escapeHtml(t("event.relatedActors", locale))}</h2><div class="tag-list">${event.actors.map((actor) => `<span>${escapeHtml(actor.name)} · ${escapeHtml(actor.progressStage)}</span>`).join("") || `<span>${escapeHtml(t("event.noActors", locale))}</span>`}</div></section>
        </aside>
      </div>
    </article>
    <section class="section section-tint"><div class="shell">${sectionHead("RELATED", t("event.relatedSection", locale), t("event.relatedDesc", locale))}
      <div class="related-grid">${related.map((event) => eventCompact(event, locale)).join("") || emptyState(t("event.noRelated", locale), "")}</div></div></section>`;
}

function scoutPage(model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("sparkles", t("scout.heroTitle", locale), t("scout.heroDesc", locale), t("scout.statusHypotheses", locale).replace("{count}", String(model.scout.length)), t("scout.statusDisclaimer", locale), locale)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("scout", locale)}</div><div class="filter-toolbar"><button class="active" data-card-filter="all">${t("scout.filterAll", locale)}</button><button data-card-filter="venture">${t("scout.filterVenture", locale)}</button><button data-card-filter="media">${t("scout.filterMedia", locale)}</button><button data-card-filter="work">${t("scout.filterWork", locale)}</button></div>
    <div class="scout-grid" data-filter-grid>${model.scout.map((insight) => scoutCard(insight, locale)).join("") || emptyState(t("scout.empty", locale), "")}</div></section>`;
}

function actorsPage(model: StaticSiteModel, locale: Locale): string {
  const cn = model.actors.filter((actor) => actor.region === "CN").length;
  return `${toolHeader("users", t("actors.heroTitle", locale), t("actors.heroDesc", locale), t("actors.statusActors", locale).replace("{count}", String(model.actors.length)), t("actors.statusChina", locale).replace("{count}", String(cn)), locale)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("actors", locale)}</div><div class="filter-toolbar"><button class="active" data-card-filter="all">${t("actors.filterAll", locale)}</button><button data-card-filter="CN">${t("actors.filterChina", locale)}</button><button data-card-filter="GLOBAL">${t("actors.filterGlobal", locale)}</button><button data-card-filter="US">${t("actors.filterUS", locale)}</button></div>
    <div class="actor-grid" data-filter-grid>${[...model.actors]
      .sort((a, b) => b.tableScore - a.tableScore)
      .map((actor) => actorCard(actor, locale))
      .join("")}</div></section>`;
}

function resourcesPage(model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("box", t("resources.heroTitle", locale), t("resources.heroDesc", locale), t("resources.statusCount", locale).replace("{count}", String(model.resources.length)), t("resources.statusCheck", locale), locale)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("resources", locale)}</div><div class="resource-grid">${model.resources.map((resource) => resourceCard(resource, locale)).join("")}</div><p class="legal-note">${escapeHtml(t("resources.legalNote", locale))}</p></section>`;
}

function productPage(model: StaticSiteModel, locale: Locale): string {
  const evaluation = model.product.evaluation;
  const domains = [...new Set(model.product.capabilities.map((item) => item.domain))];
  return `${toolHeader("gauge", t("product.heroTitle", locale), t("product.heroDesc", locale), evaluation ? t("product.statusScore", locale).replace("{score}", String(evaluation.overallScore)) : t("product.statusPending", locale), t("product.statusCapabilities", locale).replace("{count}", String(model.product.capabilities.length)), locale)}
    <section class="section shell"><div class="tool-tabs">${toolTabs("product", locale)}</div>
      <div class="product-metrics">${metric(t("product.metricVersion", locale), `v${model.product.version}`)}${metric(t("product.metricSources", locale), model.product.sourceCoverage.total)}${metric(t("product.metricObserving", locale), model.product.sourceCoverage.observing)}${metric(t("product.metricCoverage", locale), evaluation ? `${evaluation.evidenceCoverage}%` : "—")}</div>
      ${sectionHead("01 / EVALUATION", t("product.evalTitle", locale), t("product.evalDesc", locale))}
      <div class="evaluation-grid">${(evaluation?.dimensions || []).map((item) => evaluationCard(item, locale)).join("") || emptyState(t("product.evalEmpty", locale), "")}</div>
      ${sectionHead("02 / CAPABILITY MAP", t("product.capabilityTitle", locale), t("product.capabilityDesc", locale))}
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
      ${sectionHead("03 / STATE 1–5", t("product.roadmapTitle", locale), t("product.roadmapDesc", locale))}
      <div class="roadmap-grid">${model.product.roadmap.map((stage) => `<article><span>STATE ${stage.state} · ${escapeHtml(stage.status)}</span><h3>${escapeHtml(stage.name)}</h3><p>${escapeHtml(stage.promise)}</p><ul>${stage.milestones.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`).join("")}</div>
    </section>`;
}

function changelogPage(model: StaticSiteModel, locale: Locale): string {
  return `<section class="page-hero shell"><span class="section-kicker">PRODUCT EVOLUTION</span><h1>${escapeHtml(t("changelog.heroTitle", locale))}</h1><p>${escapeHtml(t("changelog.heroDesc", locale))}</p>${pageStatus(t("changelog.status", locale).replace("{count}", String(model.product.releases.length)), t("changelog.current", locale).replace("{version}", model.product.version), t("changelog.nav", locale))}</section>
    <section class="section shell"><div class="changelog-rail">${model.product.releases.map((release, index) => releaseDetail(release, index === 0, locale)).join("")}</div></section>`;
}

function sourcesPage(model: StaticSiteModel, locale: Locale): string {
  const coverage = model.product.sourceCoverage;
  const technologyCoverage = analyzeTechnologyCoverage(model.sources);
  const gaps = technologyCoverage.filter((item) => item.status !== "covered").length;
  const automaticInfluencers = model.influencers.filter((item) => item.feedSourceSlug).length;
  const restrictedProfiles = model.influencers
    .flatMap((item) => item.profiles)
    .filter((profile) => profile.access === "restricted").length;
  return `<section class="page-hero shell"><span class="section-kicker">SOURCE MAP</span><h1>${escapeHtml(t("sources.heroTitle", locale))}</h1><p>${escapeHtml(t("sources.heroDesc", locale))}</p>${pageStatus(t("sources.statusTotal", locale).replace("{total}", String(coverage.total)), t("sources.statusObserving", locale).replace("{total}", String(coverage.observing)), t("sources.statusActive", locale).replace("{total}", String(coverage.active)))}</section>
    <section class="section shell coverage-audit-section">
      ${sectionHead(t("sources.coverageKicker", locale), t("sources.coverageTitle", locale), t("sources.coverageDesc", locale))}
      <div class="coverage-summary">${metric(locale === "en" ? "Technology areas" : "重点技术领域", technologyCoverage.length)}${metric(locale === "en" ? "Need strengthening" : "需要补强", gaps)}${metric(locale === "en" ? "Recently healthy sources" : "最近健康来源", model.sources.filter((source) => source.healthStatus === "healthy").length)}${metric(locale === "en" ? "Unchecked sources" : "尚未验证来源", model.sources.filter((source) => source.healthStatus === "unchecked").length)}</div>
      <div class="filter-toolbar coverage-filters"><button class="active" data-card-filter="all">${locale === "en" ? "All" : "全部"}</button><button data-card-filter="gap">${t("sources.coverageGap", locale)}</button><button data-card-filter="watch">${t("sources.coverageWatch", locale)}</button><button data-card-filter="unchecked">${t("sources.coverageUnchecked", locale)}</button><button data-card-filter="covered">${t("sources.coverageCovered", locale)}</button></div>
      <div class="technology-coverage-grid" data-filter-grid>${technologyCoverage.map((item) => technologyCoverageCard(item, locale)).join("")}</div>
    </section>
    <section class="section shell influencer-section">
      ${sectionHead("KOL SIGNAL MATRIX", locale === "en" ? "The people shaping AI judgment" : "值得持续跟踪的 AI 核心个人", locale === "en" ? "Personal feeds enter the normal evidence pipeline; restricted social profiles remain discovery signals and never become sole factual evidence." : "个人 RSS/Atom 进入正常证据链；X、LinkedIn、微博与即刻受限账号只作为发现线索，不会单独成为重大事实证据。")}
      <div class="coverage-summary">${metric(locale === "en" ? "Core people" : "核心个人", model.influencers.length)}${metric(locale === "en" ? "Automatic feeds" : "自动个人 Feed", automaticInfluencers)}${metric(locale === "en" ? "China" : "中国", model.influencers.filter((item) => item.region === "CN").length)}${metric(locale === "en" ? "Restricted profiles" : "平台受限入口", restrictedProfiles)}</div>
      <div class="influencer-grid">${model.influencers.map((item) => influencerCard(item, locale)).join("")}</div>
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("SOURCE RUNTIME", t("sources.catalogTitle", locale), t("sources.catalogDesc", locale))}
      <div class="source-standard">${sourceLevel("E0", "Catalog", t("sources.levelE0Desc", locale))}${sourceLevel("E1", "Reachable", t("sources.levelE1Desc", locale))}${sourceLevel("E2", "Healthy", t("sources.levelE2Desc", locale))}${sourceLevel("E3", "Observing", t("sources.levelE3Desc", locale))}${sourceLevel("E4", "Production", t("sources.levelE4Desc", locale))}</div>
      <div class="source-toolbar"><label class="search-box">${icon("search")}<input data-source-search type="search" placeholder="${escapeHtml(t("sources.searchPlaceholder", locale))}"></label><div class="chip-row"><button class="active" data-source-filter="all">${t("sources.filterAll", locale)}</button><button data-source-filter="active">${t("sources.filterActive", locale)}</button><button data-source-filter="observing">${t("sources.filterObserving", locale)}</button><button data-source-filter="CN">${t("sources.filterChina", locale)}</button></div></div>
      <div class="source-table" data-source-grid>${model.sources.map((src) => sourceRow(src, locale)).join("")}</div>
      <div class="contribute-card"><div>${icon("git-pull-request")}<h2>${escapeHtml(t("sources.contributeTitle", locale))}</h2><p>${escapeHtml(t("sources.contributeDesc", locale))}</p></div><a class="button primary" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">${t("sources.contributeButton", locale)} ${icon("arrow-right")}</a></div>
    </div></section>`;
}

function influencerCard(item: PublicInfluencer, locale: Locale): string {
  const profiles = item.profiles
    .map((profile) => {
      const url = safeExternalLink(profile.url);
      if (!url) return "";
      const label = `${profile.platform === "x" ? "X" : profile.platform} · ${profile.handle}`;
      return `<a class="influencer-profile ${escapeHtml(profile.access)}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(label)}</span><small>${profile.access === "automatic" ? (locale === "en" ? "automatic" : "可自动采集") : locale === "en" ? "restricted" : "平台受限"}</small>${icon("external-link")}</a>`;
    })
    .join("");
  return `<article class="influencer-card"><header><span>${escapeHtml(item.region === "CN" ? (locale === "en" ? "China" : "中国") : locale === "en" ? "Global" : "全球")}</span><strong>${item.feedSourceSlug ? (locale === "en" ? "FEED ACTIVE" : "FEED 已接入") : locale === "en" ? "IDENTITY ONLY" : "身份观测"}</strong></header><h3>${escapeHtml(item.name)}</h3><p>${item.focus.map((focus) => escapeHtml(focus)).join(" · ")}</p><div>${profiles}</div></article>`;
}

function legalPage(model: StaticSiteModel, locale: Locale): string {
  return `<section class="page-hero shell"><span class="section-kicker">COPYRIGHT & SOURCE POLICY</span><h1>${escapeHtml(t("legal.heroTitle", locale))}</h1><p>${escapeHtml(t("legal.heroDesc", locale))}</p>${pageStatus(t("legal.statusCode", locale), t("legal.statusThirdParty", locale), t("legal.statusCorrection", locale))}</section>
    <section class="section shell legal-layout">
      <nav class="legal-nav"><a href="#scope">${escapeHtml(t("legal.navScope", locale))}</a><a href="#sources">${escapeHtml(t("legal.navSources", locale))}</a><a href="#correction">${escapeHtml(t("legal.navCorrection", locale))}</a><a href="#disclaimer">${escapeHtml(t("legal.navDisclaimer", locale))}</a><a href="#icons">${escapeHtml(t("legal.navIcons", locale))}</a></nav>
      <div class="legal-copy">
        <section id="scope"><span>01</span><h2>${escapeHtml(t("legal.scopeTitle", locale))}</h2><p>${escapeHtml(t("legal.scopeDesc", locale))}</p></section>
        <section id="sources"><span>02</span><h2>${escapeHtml(t("legal.sourcesTitle", locale))}</h2><p>${escapeHtml(t("legal.sourcesDesc", locale))}</p></section>
        <section id="correction"><span>03</span><h2>${escapeHtml(t("legal.correctionTitle", locale))}</h2><p>${escapeHtml(t("legal.correctionDesc", locale))}</p><a class="button quiet" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">${escapeHtml(t("legal.correctionButton", locale))}</a></section>
        <section id="disclaimer"><span>04</span><h2>${escapeHtml(t("legal.disclaimerTitle", locale))}</h2><p>${escapeHtml(t("legal.disclaimerDesc", locale))}</p></section>
        <section id="icons"><span>05</span><h2>${escapeHtml(t("legal.iconsTitle", locale))}</h2><p>${escapeHtml(t("legal.iconsDesc", locale))}</p><a class="text-link" href="__ASSET_PREFIX__assets/THIRD_PARTY_NOTICES.txt">${t("legal.viewNotices", locale)} ${icon("arrow-right")}</a></section>
      </div>
    </section>`;
}

function notFoundPage(model: StaticSiteModel, locale: Locale): string {
  return pageLayout({
    title: t("notFound.title", locale),
    description: t("notFound.desc", locale),
    route: "/404.html",
    depth: 0,
    active: "home",
    locale,
    body: `<section class="not-found shell"><span>404</span><h1>${escapeHtml(t("notFound.heading", locale))}</h1><p>${escapeHtml(t("notFound.body", locale))}</p><div><a class="button primary" href="./">${escapeHtml(t("notFound.home", locale))}</a><a class="button quiet" href="./lines/">${escapeHtml(t("notFound.lines", locale))}</a><a class="button quiet" href="./timeline/">${escapeHtml(t("notFound.timeline", locale))}</a></div></section>`,
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
  locale: Locale,
): string {
  return `<section class="tool-hero shell"><div>${icon(iconName)}<span class="section-kicker">${locale === "en" ? "GO DEEPER" : "继续深入"}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div>${pageStatus(state, action, "")}</section>`;
}

function toolTabs(active: string, locale: Locale): string {
  const tabs: Array<[string, string]> = [
    ["scout", t("tab.scout", locale)],
    ["actors", t("tab.actors", locale)],
    ["resources", t("tab.resources", locale)],
    ["product", t("tab.product", locale)],
  ];
  return tabs
    .map(
      ([route, label]) =>
        `<a href="__PREFIX__${route}/"${route === active ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
}

function journeyStep(title: string, copy: string): string {
  return `<li><strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span></li>`;
}

function pageStatus(left: string, middle: string, right: string): string {
  return `<div class="page-status"><span>${escapeHtml(left)}</span><span>${escapeHtml(middle)}</span><span>${escapeHtml(right)}</span></div>`;
}

function sectionHead(kicker: string, title: string, copy: string): string {
  return `<header class="section-head"><div><span class="section-kicker">${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2></div><p>${escapeHtml(copy)}</p></header>`;
}

function lens(
  label: string,
  copy: string | null | undefined,
  kind: string,
  locale: Locale,
): string {
  return `<section class="decision-lens ${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><p>${escapeHtml(copy || t("common.noJudgment", locale))}</p></section>`;
}

function lineSummary(model: StaticSiteModel, track: PublicTrack, locale: Locale): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  const latest = events[0];
  return `<article class="line-summary" style="--track-color:${escapeHtml(track.color)}"><div><span>${escapeHtml(track.name)} · ${t("lines.nodes", locale).replace("{count}", String(events.length))}</span><h3>${escapeHtml(narrative?.now || track.description)}</h3><p>${escapeHtml(narrative?.thesis || track.description)}</p></div><footer><span>${latest ? t("lines.latest", locale).replace("{date}", formatDate(latest.happenedAt, locale)) : t("lines.waitingEvidence", locale)}</span><a href="__PREFIX__lines/${escapeHtml(track.slug)}/">${t("lines.openLine", locale)} ${icon("arrow-right")}</a></footer></article>`;
}

function lineDirectoryCard(model: StaticSiteModel, track: PublicTrack, locale: Locale): string {
  const narrative = narrativeFor(model, track.slug);
  const events = eventsForTrack(model.events, track.slug);
  return `<a class="line-directory-card" href="__PREFIX__lines/${escapeHtml(track.slug)}/" style="--track-color:${escapeHtml(track.color)}"><span>${escapeHtml(track.perspective)} · ${events.length} ${locale === "en" ? "nodes" : "节点"}</span><h2>${escapeHtml(track.name)}</h2><p>${escapeHtml(narrative?.now || track.description)}</p><div><strong>${locale === "en" ? "Next" : "下一观察"}</strong><small>${escapeHtml(narrative?.next || t("lines.nextWait", locale))}</small></div></a>`;
}

function gateway(
  iconName: string,
  title: string,
  stat: string,
  copy: string,
  route: string,
  locale: Locale,
): string {
  return `<a class="gateway-card" href="__PREFIX__${escapeHtml(route)}"><div>${icon(iconName)}<span>${escapeHtml(stat)}</span></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p><strong>${t("home.enterTool", locale)} ${icon("arrow-right")}</strong></a>`;
}

function phaseCard(
  stage: {
    period: string;
    label: string;
    summary: string;
    chinaPosition: string;
  },
  locale: Locale,
): string {
  return `<article><span>${escapeHtml(stage.period)}</span><h3>${escapeHtml(stage.label)}</h3><p>${escapeHtml(stage.summary)}</p><div><strong>${locale === "en" ? "China Progress" : "本土进展"}</strong><p>${escapeHtml(stage.chinaPosition)}</p></div></article>`;
}

function roleLens(role: string, question: string, locale: Locale, answer?: string): string {
  return `<article><span>${escapeHtml(role)}</span><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer || t("common.noJudgment", locale))}</p></article>`;
}

function eventRow(event: EnrichedEvent, locale: Locale): string {
  const recent = isRecentEvent(event);
  return `<a class="event-row${recent ? " is-recent" : ""}" data-recent="${recent}" data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"><time>${escapeHtml(formatDate(event.happenedAt, locale))}</time><div><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(event.company || t("event.unknownEntity", locale))} · ${escapeHtml(event.tracks[0]?.name || t("timeline.pendingTrack", locale))}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></div><small>${escapeHtml(evidenceLabel(event, locale))}</small>${icon("arrow-right")}</a>`;
}

function researchCard(event: EnrichedEvent, locale: Locale): string {
  const recent = isRecentEvent(event);
  return `<article class="research-card${recent ? " is-recent" : ""}" data-recent="${recent}"><header><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(t("home.researchPreprint", locale))}</span><time>${escapeHtml(formatDate(event.happenedAt, locale))}</time></header><h3>${escapeHtml(event.title)}</h3><div><span>${escapeHtml(t("home.researchMethod", locale))}</span><p>${escapeHtml(event.technicalInsight)}</p></div><div><span>${escapeHtml(t("home.researchDecision", locale))}</span><p>${escapeHtml(event.businessValue || event.industryInsight)}</p></div><a data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/">${t("home.readResearch", locale)} ${icon("arrow-right")}</a></article>`;
}

function isResearchEvent(event: EnrichedEvent): boolean {
  return ["research", "paper"].includes(event.category.toLowerCase());
}

function isReviewedResearch(event: EnrichedEvent): boolean {
  return (
    isResearchEvent(event) &&
    hasPrimaryEvidence(event) &&
    event.technicalInsight.trim().length >= 80 &&
    event.industryInsight.trim().length >= 50 &&
    event.futureOutlook.trim().length >= 40
  );
}

function researchDayGroup(day: string, events: EnrichedEvent[], locale: Locale): string {
  const label = formatDate(`${day}T00:00:00.000Z`, locale);
  const topics = [...new Set(events.flatMap((event) => event.keywords))].slice(0, 6);
  return `<details class="research-day-group" data-research-group data-research-day="${escapeHtml(day)}"><summary><div><span>${escapeHtml(t("timeline.researchDigest", locale))} · ${escapeHtml(label)}</span><strong>${escapeHtml(t("timeline.researchDigestCount", locale).replace("{count}", String(events.length)))}</strong><p>${escapeHtml(topics.join(" · ") || t("timeline.researchDigestFallback", locale))}</p></div><span>${escapeHtml(t("timeline.expandResearch", locale))} ${icon("chevron-down")}</span></summary><div class="research-day-grid">${events.map((event) => timelineCard(event, locale)).join("")}</div></details>`;
}

function timelineCard(event: EnrichedEvent, locale: Locale): string {
  const search = [event.title, event.company, event.factSummary, ...event.keywords]
    .join(" ")
    .toLowerCase();
  const tracks = event.tracks.map((track) => track.slug).join(" ");
  const developments = eventDevelopments(event);
  const recent = isRecentEvent(event);
  return `<button class="timeline-card${isResearchEvent(event) ? " research" : ""}${recent ? " is-recent" : ""}" type="button" data-recent="${recent}" data-event="${escapeHtml(event.slug)}" data-search="${escapeHtml(search)}" data-tracks="${escapeHtml(tracks)}" data-category="${escapeHtml(event.category)}" data-research="${isResearchEvent(event)}" data-research-reviewed="${isReviewedResearch(event)}" data-primary="${hasPrimaryEvidence(event)}" aria-controls="event-drawer" aria-haspopup="dialog"><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(t("timeline.latestUpdate", locale).replace("{date}", formatDate(latestDevelopmentAt(event), locale)))} · ${escapeHtml(event.company || t("event.unknownEntity", locale))}</span><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.factSummary)}</p><div class="timeline-card-tags"><span>${escapeHtml(categoryName(event.category, locale))}</span>${event.keywords
    .slice(0, 3)
    .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
    .join(
      "",
    )}</div><footer><span>${escapeHtml(t("timeline.developments", locale).replace("{count}", String(developments.length)))}</span><strong>${escapeHtml(evidenceLabel(event, locale))}</strong></footer></button>`;
}

function eventJourney(event: EnrichedEvent, locale: Locale, compact = false): string {
  const developments = eventDevelopments(event);
  const visible = compact ? developments.slice(-4) : developments;
  const items = visible
    .map(({ kind, evidence }) => {
      const url = safeExternalLink(evidence.url);
      const body = `<span>${escapeHtml(developmentLabel(kind, locale))}</span><time>${escapeHtml(formatDate(evidence.publishedAt, locale))}</time><strong>${escapeHtml(evidence.title)}</strong><small>${escapeHtml(evidence.source)}</small>`;
      return `<li class="event-step ${escapeHtml(kind)}">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}${icon("external-link")}</a>` : `<div>${body}</div>`}</li>`;
    })
    .join("");
  const assessment = event.industryInsight || event.summary;
  return `<ol class="event-journey${compact ? " compact" : ""}">${items}<li class="event-step assessment"><div><span>${escapeHtml(t("event.currentAssessment", locale))}</span><time>${escapeHtml(formatDate(latestDevelopmentAt(event), locale))}</time><strong>${escapeHtml(assessment || t("common.noJudgment", locale))}</strong><small>Agent Pulse · ${locale === "en" ? "analysis" : "分析"}</small></div></li></ol>`;
}

function developmentLabel(
  kind: ReturnType<typeof eventDevelopments>[number]["kind"],
  locale: Locale,
): string {
  const keys = {
    origin: "event.developmentOrigin",
    official: "event.developmentOfficial",
    discussion: "event.developmentDiscussion",
    response: "event.developmentResponse",
  } as const;
  return t(keys[kind], locale);
}

function insight(
  label: string,
  copy: string | null | undefined,
  kind: string,
  locale: Locale,
): string {
  return `<section class="insight ${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><p>${escapeHtml(copy || t("common.noJudgment", locale))}</p></section>`;
}

function score(label: string, value: number, locale: Locale): string {
  return `<div><strong>${escapeHtml(scoreBand(value, locale))}</strong><span>${escapeHtml(label)}</span><small>${value}/100</small></div>`;
}

function evidenceLinks(event: EnrichedEvent, locale: Locale): string {
  return event.evidence
    .map((evidence) => {
      const url = safeExternalLink(evidence.url);
      return url
        ? `<a class="evidence-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(evidence.title)}</strong><span>${escapeHtml(evidence.source)} · ${escapeHtml(evidenceRole(evidence.role, locale))} · ${escapeHtml(formatDate(evidence.publishedAt, locale))}</span>${icon("external-link")}</a>`
        : "";
    })
    .join("");
}

function eventCompact(event: EnrichedEvent, locale: Locale): string {
  const recent = isRecentEvent(event);
  return `<a class="${recent ? "is-recent" : ""}" data-recent="${recent}" data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(formatDate(event.happenedAt, locale))}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></a>`;
}

function recentBadge(locale: Locale): string {
  return locale === "en" ? "LAST 7 DAYS" : "近 7 天";
}

function densityItem(
  item: ReturnType<typeof recentMonthlyDensity>[number],
  locale: Locale,
): string {
  const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${item.key}-01T00:00:00.000Z`));
  const status =
    item.status === "in-progress"
      ? locale === "en"
        ? "in progress"
        : "持续更新"
      : item.status === "balanced"
        ? locale === "en"
          ? "baseline met"
          : "达到基线"
        : locale === "en"
          ? "backfill needed"
          : "仍需补齐";
  return `<div class="${escapeHtml(item.status)}"><span>${escapeHtml(label)}</span><strong>${item.count}</strong><small>${escapeHtml(status)}</small></div>`;
}

function researchBatchItem(
  item: ReturnType<typeof recentResearchBatches>[number],
  locale: Locale,
): string {
  const label = formatDate(`${item.day}T00:00:00.000Z`, locale);
  const copy =
    item.status === "published"
      ? locale === "en"
        ? `${item.count} verified papers`
        : `${item.count} 篇已验证论文`
      : item.status === "weekend"
        ? locale === "en"
          ? "official weekend cadence"
          : "官方周末无新批次"
        : locale === "en"
          ? "awaiting the next verified batch"
          : "等待下一批官方更新";
  return `<div class="${escapeHtml(item.status)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(copy)}</strong></div>`;
}

function scoutCard(insight: PublicScoutInsight, locale: Locale): string {
  return `<article class="scout-card" data-filter-value="${escapeHtml(insight.kind)}"><header><span>${escapeHtml(scoutKind(insight.kind, locale))} · ${escapeHtml(insight.horizon)}</span><strong>${insight.totalScore}/100</strong></header><h2>${escapeHtml(insight.title)}</h2><p class="hypothesis">${escapeHtml(insight.hypothesis)}</p><div class="scout-sections"><section><span>${locale === "en" ? "Why Now" : "为什么现在"}</span><p>${escapeHtml(insight.whyNow)}</p></section><section><span>${locale === "en" ? "Minimum Action" : "最小动作"}</span><p>${escapeHtml(insight.suggestedAction)}</p></section><section><span>${locale === "en" ? "Artifact" : "建议产物"}</span><p>${escapeHtml(insight.artifactIdea)}</p></section><section class="counter"><span>${locale === "en" ? "What Could Go Wrong" : "可能错在哪"}</span><p>${escapeHtml(insight.counterSignals)}</p></section></div><footer>${insight.evidence.map((item) => `<a data-event-link="${escapeHtml(item.slug)}" href="__PREFIX__events/${escapeHtml(item.slug)}/">${locale === "en" ? "Evidence" : "证据"} · ${escapeHtml(item.title)}</a>`).join("")}</footer></article>`;
}

function actorCard(actor: PublicActor, locale: Locale): string {
  const url = safeExternalLink(actor.websiteUrl);
  return `<article class="actor-card" data-filter-value="${escapeHtml(actor.region)}"><header><span>${escapeHtml(actor.region)} · ${escapeHtml(actor.type)}</span><strong>${escapeHtml(scoreBand(actor.tableScore, locale))}</strong></header><h2>${escapeHtml(actor.name)}</h2><p>${escapeHtml(actor.scale)} · ${escapeHtml(actor.domains.join(" / ") || t("actors.domainUnknown", locale))}</p><div class="observation-note">${escapeHtml(t("actors.observationNote", locale))}</div>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("actors.website", locale))} ${icon("external-link")}</a>` : ""}</article>`;
}

function resourceCard(resource: PublicResource, locale: Locale): string {
  const purchase = safeExternalLink(resource.purchaseUrl);
  const source = safeExternalLink(resource.sourceUrl);
  return `<article class="resource-card"><header><span>${escapeHtml(resource.audience)} · ${resource.riskLevel === "official" ? t("resources.official", locale) : t("resources.reference", locale)}</span><strong>${escapeHtml(resource.region)}</strong></header><h2>${escapeHtml(resource.model)}</h2><p>${escapeHtml(resource.provider)} · ${escapeHtml(resource.planName)}</p><div class="price-pair"><div><span>${t("resources.input", locale)}</span><strong>${formatPrice(resource.inputPrice, resource.currency, locale)}</strong></div><div><span>${t("resources.output", locale)}</span><strong>${formatPrice(resource.outputPrice, resource.currency, locale)}</strong></div></div><small>${resource.unit ? `${resource.unit} · ` : ""}${t("resources.verified", locale).replace("{date}", formatDate(resource.verifiedAt, locale))}</small><footer>${purchase ? `<a href="${escapeHtml(purchase)}" target="_blank" rel="noopener noreferrer">${t("resources.officialLink", locale)} ${icon("external-link")}</a>` : ""}${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${t("resources.priceSource", locale)} ${icon("external-link")}</a>` : ""}</footer></article>`;
}

function evaluationCard(item: EvaluationDimension, locale: Locale): string {
  return `<article><header><span>${escapeHtml(item.status)}</span><strong>${item.score}<small>/100</small></strong></header><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><dl><div><dt>Raw</dt><dd>${item.rawScore}</dd></div><div><dt>${escapeHtml(t("product.hardCap", locale))}</dt><dd>${item.scoreCap}</dd></div><div><dt>${escapeHtml(t("product.sample", locale))}</dt><dd>${item.sampleSize}/${item.sampleTarget}</dd></div></dl><ul>${item.penalties.map((penalty) => `<li>${escapeHtml(penalty)}</li>`).join("")}</ul><div class="next-action"><span>${escapeHtml(t("product.nextAction", locale))}</span><p>${escapeHtml(item.nextAction)}</p></div></article>`;
}

function releaseDetail(release: Release, open: boolean, locale: Locale): string {
  const unreleased = release.status === "unreleased";
  const marker = unreleased ? t("changelog.next", locale) : `v${release.version}`;
  const label = unreleased
    ? t("changelog.inDevelopment", locale)
    : open
      ? t("changelog.latest", locale)
      : t("changelog.release", locale);
  const anchor = unreleased ? "unreleased" : `v${release.version.replaceAll(".", "-")}`;
  return `<article class="release-node" id="${escapeHtml(anchor)}"><div class="release-marker"><i></i><span>${escapeHtml(marker)}</span><time>${escapeHtml(release.date)}</time></div><details${open ? " open" : ""}><summary><div><span>${escapeHtml(label)}</span><h2>${escapeHtml(release.name)}</h2><p>${escapeHtml(release.summary)}</p></div>${icon("chevron-down")}</summary><div class="release-body"><section><h3>${escapeHtml(t("changelog.capabilities", locale))}</h3><div class="capability-pills">${release.capabilities.map((item) => `<span>${icon("check")} ${escapeHtml(item)}</span>`).join("")}</div></section><section><h3>${escapeHtml(t("changelog.changes", locale))}</h3><ol>${release.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ol></section></div></details></article>`;
}

function sourceLevel(level: string, title: string, copy: string): string {
  return `<article><strong>${escapeHtml(level)}</strong><span>${escapeHtml(title)}</span><p>${escapeHtml(copy)}</p></article>`;
}

function technologyCoverageCard(item: TechnologyCoverage, locale: Locale): string {
  const copy = technologyCoverageCopy(item, locale);
  const sourcePreview = [...item.sources]
    .sort((left, right) => {
      const itemName = item.name.toLowerCase();
      const leftExact = left.name.toLowerCase().includes(itemName) ? 1 : 0;
      const rightExact = right.name.toLowerCase().includes(itemName) ? 1 : 0;
      return (
        rightExact - leftExact || healthRank(right.healthStatus) - healthRank(left.healthStatus)
      );
    })
    .slice(0, 4)
    .map(
      (source) =>
        `<span class="source-health ${escapeHtml(source.healthStatus)}"><i></i>${escapeHtml(source.name)} · ${escapeHtml(sourceHealthLabel(source, locale))}</span>`,
    )
    .join("");
  return `<article class="technology-coverage-card ${escapeHtml(item.status)}" data-filter-value="${escapeHtml(item.status)}"><header><span>${escapeHtml(coverageStatusLabel(item.status, locale))}</span><strong>${escapeHtml(t("sources.coverageHealthyCount", locale).replace("{count}", String(item.healthySources)))}</strong></header><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(copy.description)}</p><div class="coverage-channels">${item.channels.map((channel) => `<span>${escapeHtml(coverageChannelLabel(channel, locale))}</span>`).join("") || `<span>${locale === "en" ? "No validated channel" : "暂无已验证渠道"}</span>`}</div><div class="coverage-sources"><small>${escapeHtml(t("sources.coverageSourceCount", locale).replace("{count}", String(item.sources.length)))}</small>${sourcePreview || `<span class="source-health unchecked"><i></i>${locale === "en" ? "No catalog source" : "目录暂无来源"}</span>`}</div>${item.missingChannels.length ? `<div class="coverage-missing"><span>${escapeHtml(t("sources.coverageMissing", locale))}</span><p>${item.missingChannels.map((channel) => escapeHtml(coverageChannelLabel(channel, locale))).join(" · ")}</p></div>` : ""}<footer><span>${escapeHtml(t("sources.coverageNext", locale))}</span><p>${escapeHtml(copy.nextAction)}</p></footer></article>`;
}

function sourceRow(source: PublicSource, locale: Locale): string {
  const filter = `${source.region} ${source.lifecycle} ${source.healthStatus} ${source.observationEnabled ? "observing" : ""}`;
  const url = safeExternalLink(source.homepageUrl);
  return `<article data-source-value="${escapeHtml(filter)}" data-source-search-value="${escapeHtml([source.name, source.slug, source.region, source.category, ...source.topics].join(" ").toLowerCase())}"><div><strong>${escapeHtml(source.name)}</strong><span>${escapeHtml(source.slug)}</span></div><span>${escapeHtml(source.region)}</span><span>${escapeHtml(source.category)}</span><span>Tier ${source.tier}</span><span>${source.observationEnabled ? "E3 observing" : escapeHtml(source.lifecycle)}</span><span class="source-runtime ${escapeHtml(source.healthStatus)}"><i></i>${escapeHtml(sourceHealthLabel(source, locale))}</span>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${t("sources.ariaOpen", locale).replace("{name}", source.name)}">${icon("external-link")}</a>` : ""}</article>`;
}

function coverageStatusLabel(status: TechnologyCoverage["status"], locale: Locale): string {
  const keys = {
    covered: "sources.coverageCovered",
    watch: "sources.coverageWatch",
    gap: "sources.coverageGap",
    unchecked: "sources.coverageUnchecked",
  } as const;
  return t(keys[status], locale);
}

function coverageChannelLabel(channel: string, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    official: ["官方动态", "Official updates"],
    releases: ["版本发布", "Releases"],
    sdk: ["SDK / 协议", "SDK / protocol"],
    research: ["研究", "Research"],
    community: ["社区实践", "Community practice"],
    enterprise: ["企业采用", "Enterprise adoption"],
  };
  const label = labels[channel];
  return label ? label[locale === "en" ? 1 : 0] : channel;
}

function sourceHealthLabel(source: PublicSource, locale: Locale): string {
  const labels: Record<PublicSource["healthStatus"], [string, string]> = {
    healthy: ["最近健康", "healthy"],
    degraded: ["部分可用", "degraded"],
    failed: [
      source.healthErrorCode ? `失败 ${source.healthErrorCode}` : "检查失败",
      source.healthErrorCode ? `failed ${source.healthErrorCode}` : "failed",
    ],
    skipped: ["需人工核验", "manual review"],
    unchecked: ["尚未验证", "unchecked"],
  };
  return labels[source.healthStatus][locale === "en" ? 1 : 0];
}

function healthRank(status: PublicSource["healthStatus"]): number {
  return { healthy: 5, degraded: 4, failed: 3, skipped: 2, unchecked: 1 }[status];
}

function technologyCoverageCopy(
  item: TechnologyCoverage,
  locale: Locale,
): { description: string; nextAction: string } {
  if (locale !== "en") return { description: item.description, nextAction: item.nextAction };
  const copy: Record<string, { description: string; nextAction: string }> = {
    "claude-code": {
      description:
        "Product updates, hooks, subagents, SDK, memory, context compression, and enterprise practice.",
      nextAction:
        "Strengthen Anthropic engineering updates, Claude Code documentation changes, and high-quality community practice.",
    },
    "openai-codex": {
      description:
        "Models, Codex, SDKs, agent platforms, enterprise capabilities, and developer ecosystem.",
      nextAction:
        "Keep Codex, Agents SDK, model, and enterprise product updates on distinct evidence paths.",
    },
    "google-deepmind": {
      description:
        "Frontier research, Gemini capabilities, agent development stack, and product adoption.",
      nextAction:
        "Connect Gemini product updates, Google ADK, and research results into shared event stories.",
    },
    cursor: {
      description:
        "Editor capabilities, agent workflows, enterprise features, and product iteration.",
      nextAction: "Repair changelog parsing and add a stable official release channel.",
    },
    windsurf: {
      description: "Editor, agent capabilities, enterprise features, and ecosystem changes.",
      nextAction: "Repair the official update parser so the source is more than a catalog entry.",
    },
    lovable: {
      description:
        "AI app building, agent capabilities, platform integrations, business model, and governance.",
      nextAction:
        "Validate the official changelog over time and add independent community and enterprise signals.",
    },
    "vercel-ai": {
      description:
        "AI SDK, frontend agent experience, streaming interaction, and application infrastructure.",
      nextAction: "Add Vercel engineering articles and production practice beyond SDK releases.",
    },
    "cloudflare-ai": {
      description: "Workers AI, edge inference, AI Gateway, browser, and agent infrastructure.",
      nextAction:
        "Separate general Cloudflare updates from changes that move the AI engineering boundary.",
    },
    mcp: {
      description:
        "Specification, SDKs, ecosystem integrations, security boundaries, and enterprise adoption.",
      nextAction: "Add specification changes, adoption, and security events beyond SDK patches.",
    },
    a2a: {
      description: "Agent2Agent specification, SDKs, interoperability, and enterprise adoption.",
      nextAction:
        "Start with specification releases, then add SDK compatibility and real interoperability cases.",
    },
    "browser-use": {
      description: "Browser agents, reliability, security, evaluation, and production deployment.",
      nextAction: "Add browser-agent evaluation, security, and real production feedback.",
    },
    "ai-coding": {
      description:
        "Coding agents, IDEs, review, long-running work, memory, and engineering workflows.",
      nextAction:
        "Cross-check product updates against real engineering practice and independent evaluation.",
    },
    "ai-infra": {
      description:
        "Training, inference, chips, compilers, observability, and cloud infrastructure.",
      nextAction: "Counter release-count bias with cost, adoption, and performance evidence.",
    },
    "ai-agent": {
      description:
        "Agent frameworks, long-running work, memory, tool use, evaluation, and commercialization.",
      nextAction:
        "Converge framework releases, research, production adoption, and business outcomes into shared evidence chains.",
    },
  };
  return copy[item.slug] ?? { description: item.description, nextAction: item.nextAction };
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

function eventJsonLd(event: EnrichedEvent, locale: Locale): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: event.title,
      description: event.factSummary,
      datePublished: event.happenedAt,
      author: { "@type": "Organization", name: "Agent Pulse" },
      publisher: { "@type": "Organization", name: "Agent Pulse" },
      inLanguage: locale,
    },
  ];
}

function hasPrimaryEvidence(event: EnrichedEvent): boolean {
  return event.evidence.some((evidence) => evidence.role === "primary");
}

function evidenceSourceCount(event: EnrichedEvent): number {
  return new Set(event.evidence.map((evidence) => evidence.source.trim().toLowerCase())).size;
}

function evidenceLabel(event: EnrichedEvent, locale: Locale): string {
  const sources = evidenceSourceCount(event);
  if (sources >= 2 && hasPrimaryEvidence(event)) return t("evidence.primaryMulti", locale);
  if (sources >= 2) return t("evidence.multiSecondary", locale);
  if (hasPrimaryEvidence(event)) return t("evidence.singlePrimary", locale);
  return event.evidence.length ? t("evidence.secondary", locale) : t("evidence.pending", locale);
}

function evidenceRole(role: string, locale: Locale): string {
  const map: Record<string, string> = {
    primary: t("role.primary", locale),
    secondary: t("role.secondary", locale),
    amplification: t("role.amplification", locale),
  };
  return map[role] || role;
}

function scoreBand(value: number, locale: Locale): string {
  if (value >= 85) return t("score.high", locale);
  if (value >= 70) return t("score.midHigh", locale);
  if (value >= 55) return t("score.medium", locale);
  return t("score.low", locale);
}

function scoutKind(kind: string, locale: Locale): string {
  const map: Record<string, string> = {
    venture: t("scoutKind.venture", locale),
    media: t("scoutKind.media", locale),
    work: t("scoutKind.work", locale),
  };
  return map[kind] || t("scoutKind.cognitive", locale);
}

function categoryName(category: string, locale: Locale): string {
  const map: Record<string, string> = {
    model: t("category.model", locale),
    research: t("category.research", locale),
    product: t("category.product", locale),
    commercialization: t("category.commercialization", locale),
    investment: t("category.investment", locale),
    policy: t("category.policy", locale),
    infrastructure: t("category.infrastructure", locale),
    talent: t("category.talent", locale),
  };
  return map[category] || category || t("category.general", locale);
}

function formatPrice(value: number | null, currency: string, locale: Locale): string {
  if (value === null || !Number.isFinite(value)) return t("resources.inquire", locale);
  return `${currency === "USD" ? "$" : `${currency} `}${value}`;
}

function clip(value: string, limit: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}
