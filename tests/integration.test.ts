import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { capitalHistoryEvents } from "../src/catalog/capital-history-2023-2025.js";
import { directResearchHistory2026 } from "../src/catalog/direct-research-history-2026.js";
import { earlyHistoryEvents } from "../src/catalog/early-history.js";
import { ecosystemHistoryEvents } from "../src/catalog/ecosystem-history-2026-07.js";
import { historicalEvents } from "../src/catalog/history.js";
import { recentDensityEvents } from "../src/catalog/recent-density.js";
import { sourceCatalog } from "../src/catalog/sources.js";
import { vendorHistoryEvents } from "../src/catalog/vendor-history-2026-07.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { exportStaticSite } from "../src/pipeline/export.js";
import { validatePublicSite } from "../src/pipeline/public-site-integrity.js";
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
    const perEventEvidence = vi.spyOn(Repository.prototype, "toPublicEvent");
    const perEventTracks = vi.spyOn(Repository.prototype, "eventTracks");
    const perEventActors = vi.spyOn(Repository.prototype, "eventActors");
    const batchedRelations = vi.spyOn(Repository.prototype, "publicEventRelations");
    const result = await exportStaticSite(db, config);
    expect(perEventEvidence).not.toHaveBeenCalled();
    expect(perEventTracks).not.toHaveBeenCalled();
    expect(perEventActors).not.toHaveBeenCalled();
    expect(batchedRelations).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
    expect(result).toMatchObject({
      events: earlyHistoryEvents.length + historicalEvents.length + recentDensityEvents.length + 6,
      tracks: 10,
      sources: sourceCatalog.length,
      signals: expect.any(Number),
      version: "0.11.1",
    });
    const timeline = await readFile(join(config.distDir, "data/timeline.json"), "utf8");
    expect(timeline).not.toContain("ADMIN_TOKEN");
    expect(timeline).not.toContain("/Users/");
    expect(timeline).not.toContain('\n  "schemaVersion"');
    expect(Buffer.byteLength(timeline)).toBeLessThan(1_400_000);
    expect(gzipSync(timeline).byteLength).toBeLessThan(300_000);
    expect(JSON.parse(timeline).events[0]).not.toHaveProperty("manual_override");
    const scout = JSON.parse(await readFile(join(config.distDir, "data/scout.json"), "utf8"));
    expect(scout.insights).toHaveLength(1);
    expect(scout.insights[0]).not.toHaveProperty("cooldown_key");
    expect(scout.insights[0].evidence[0].slug).toBe("lingbot-vla-2-cross-embodiment");
    const product = JSON.parse(await readFile(join(config.distDir, "data/product.json"), "utf8"));
    expect(product.roadmap).toHaveLength(5);
    expect(product.releases[0]).toMatchObject({ version: "unreleased", status: "unreleased" });
    expect(product.releases[1]).toMatchObject({ version: "0.11.1", status: "released" });
    expect(product.releases[2]).toMatchObject({ version: "0.11.0", status: "released" });
    expect(product.releases[3]).toMatchObject({ version: "0.10.0", status: "released" });
    expect(product.releases[4]).toMatchObject({ version: "0.9.0", status: "released" });
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
    const publicSignals = JSON.parse(
      await readFile(join(config.distDir, "data/signals.json"), "utf8"),
    );
    expect(publicSignals.signals.length).toBeGreaterThan(0);
    expect(publicSignals.signals[0]).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      url: expect.stringMatching(/^https?:\/\//),
      sourceName: expect.any(String),
      publishedAt: expect.any(String),
    });
    expect(publicSignals.signals[0]).not.toHaveProperty("summary");
    expect(publicSignals.signals[0]).not.toHaveProperty("rawMeta");
    expect(publicSignals.signals[0]).not.toHaveProperty("metrics");
    expect(publicSignals.signals[0]).not.toHaveProperty("id");
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
      ["index.html", "AI 行业关键变化与证据 · Agent Pulse"],
      ["lines/index.html", "趋势判断 · Agent Pulse"],
      ["industry-evolution/index.html", "行业演化 · Agent Pulse"],
      ["lines/tech-evolution/index.html", "模型能力与研究 · Agent Pulse"],
      ["timeline/index.html", "事件脉络 · Agent Pulse"],
      ["signals/index.html", "来源动态 · Agent Pulse"],
      ["scout/index.html", "行动参考 · Agent Pulse"],
      ["actors/index.html", "关键角色 · Agent Pulse"],
      ["resources/index.html", "模型成本 · Agent Pulse"],
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
      expect(html, path).toContain("data-back-to-top");
      expect(html, path).not.toContain("__PREFIX__");
      expect(html, path).not.toContain("/Users/");
    }
    const englishActors = await readFile(join(config.distDir, "en/actors/index.html"), "utf8");
    expect(englishActors).toContain('href="../../assets/icons.svg#sun"');
    expect(englishActors).not.toContain('href="../assets/icons.svg#sun"');
    expect(englishActors).toContain('data-timeline-src="../../data/timeline.json"');
    expect(englishActors).toContain('aria-label="Back to top"');
    const changelog = await readFile(join(config.distDir, "changelog/index.html"), "utf8");
    expect(changelog).toContain('id="v0-7-0"');
    expect(changelog).toContain('id="v0-10-0"');
    expect(changelog).toContain("LATEST RELEASE");
    expect(changelog).toContain("Living Evidence Interface");
    expect(changelog).toContain("The Autonomous Intelligence Loop");
    const englishChangelog = await readFile(
      join(config.distDir, "en/changelog/index.html"),
      "utf8",
    );
    expect(englishChangelog).toContain("LATEST RELEASE");
    const css = await readFile(join(config.distDir, "assets/app.css"), "utf8");
    const home = await readFile(join(config.distDir, "index.html"), "utf8");
    expect(Buffer.byteLength(css)).toBeLessThan(98_000);
    expect(home.indexOf('src="./assets/core.js"')).toBeLessThan(home.indexOf("</head>"));
    expect(home.match(/src="\.\/assets\/core\.js"/g)).toHaveLength(1);
    expect(home).toContain("GPT-5.6");
    expect(home).toContain("LATEST MATERIAL SHIFT");
    expect(home).toContain("最新趋势判断");
    expect(home).toContain("看清 AI 行业的关键变化");
    expect(home).toContain('class="signal-field"');
    expect(home.match(/class="trend-shift-card reveal"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(home).toContain("data-random-trends");
    expect(home).toContain("data-random-recent-list");
    expect(home).toContain('data-random-visible="6"');
    expect(home).not.toContain("data-random-recent-next");
    expect(home).not.toContain("换一批");
    expect(css).toContain(".random-recent-item[hidden]");
    expect(home.match(/data-industry-carousel/g)).toHaveLength(6);
    expect((home.match(/data-carousel-slide/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(home).not.toContain("信源网络正在看到什么");
    expect(home).not.toContain("data-random-signal-list");
    expect(home).toContain("data-random-trend-next");
    expect(home).toContain("换一个");
    expect(home).toContain("接下来观察");
    expect(home).toContain("独立信源");
    expect(home).not.toContain('class="signal-object"');
    expect(home).not.toContain('class="signal-orb"');
    expect(home).not.toContain('class="home-hero-path"');
    expect(home).not.toContain('class="signal-wave"');
    expect(home).toContain('class="footer-links"');
    expect(home).toContain('class="footer-contacts"');
    expect(home).toContain('href="mailto:barret.china@gmail.com"');
    expect(home).toContain('class="footer-snapshot"');
    expect(home).toContain("/commits/main/");
    expect(home).toContain('class="shell footer-meta"');
    expect(home).toContain('class="footer-lang"');
    expect(home).toContain('aria-label="回到顶部"');
    expect(home).toContain('class="footer-lang" href="./en/" aria-label="语言">EN</a>');
    expect(home).not.toContain("EN · English");
    expect(home.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0]).not.toContain(
      'class="lang-switcher"',
    );
    expect(home).not.toContain("<h1>持续监测 AI 行业");
    expect(home).not.toContain('class="home-intro shell"');
    expect(home).not.toContain('class="reading-journey"');
    expect(home).not.toContain("本周研究");
    expect(home).not.toContain("单一官方资料");
    expect(home).toContain('<a class="line-summary industry-trend-summary"');
    for (const sectionHead of home.matchAll(/<header class="section-head">[\s\S]*?<\/header>/g)) {
      expect(sectionHead[0]).not.toContain("<p>");
    }
    expect(home).toContain("PredicateLongBench");
    expect(home).toContain('class="github-star-button"');
    expect(home).toContain("data-github-star-button");
    expect(home).toContain("data-github-star-count");
    expect(home).toContain('data-event-link="blind-spots-bench-vision-language"');
    expect(home.indexOf("最新趋势判断")).toBeGreaterThan(home.indexOf("看清 AI 行业的关键变化"));
    expect(home).not.toContain("形成判断");
    expect(home).not.toContain("继续深入");
    expect(home).not.toContain('href="./product/"');
    expect(home).toContain('href="./actors/"');
    expect(home).toContain('href="./resources/"');
    expect(home).not.toContain(">六条主线<");
    expect(home).not.toContain(">证据时间轴<");
    expect(home).not.toContain(">决策工具<");
    const timelinePage = await readFile(join(config.distDir, "timeline/index.html"), "utf8");
    const coreSource = await readFile(join(config.rootDir, "web/public/assets/core.js"), "utf8");
    const coreScript = await readFile(join(config.distDir, "assets/core.js"), "utf8");
    const timelineScript = await readFile(join(config.distDir, "assets/timeline.js"), "utf8");
    const siteStyles = await readFile(join(config.distDir, "assets/app.css"), "utf8");
    expect(Buffer.byteLength(coreScript)).toBeLessThan(28_000);
    expect(Buffer.byteLength(timelineScript)).toBeLessThan(8_000);
    expect(coreScript).toContain('import("./timeline.js")');
    expect(timelineScript).toContain("scrollTo");
    expect(timelineScript).toContain('"smooth"');
    expect(timelineScript).toContain("data-timeline-month-template");
    expect(timelineScript).toContain("data-research-group");
    expect(timelineScript).toContain("jumpToMonth");
    expect(timelineScript).toContain('params.set("date"');
    expect(coreScript).toContain("setupGithubStarCount");
    expect(coreScript).toContain('cache:"no-store"');
    expect(coreScript).toContain("githubStarsSource=source");
    expect(coreScript).toContain('apply(stars,"live")');
    expect(coreScript).not.toContain('count.textContent?.trim()!=="—")return');
    expect(coreScript).toContain("setupHomeDynamics");
    expect(coreScript).toContain("setupSignalBrowser");
    expect(coreScript).toContain("setupBackToTop");
    expect(coreScript).toContain("setupMobileListPagination");
    expect(coreScript).toContain('matchMedia("(max-width: 820px)")');
    expect(coreScript).toContain("requestAnimationFrame");
    expect(coreScript).toContain("window.scrollTo");
    expect(coreScript).toContain("data-no-scroll-reveal");
    expect(coreScript).toContain("navigator.vibrate");
    expect(coreScript).toContain("trend-switcher");
    expect(coreScript).toContain("high-confidence");
    expect(coreScript).toContain("research");
    expect(coreScript).toContain("requestIdleCallback");
    expect(coreScript).toContain("stockLoaded");
    expect(coreScript).toContain("api.github.com/repos/");
    expect(coreScript).toContain(".scrollTop=0");
    expect(coreScript).toContain('"Official source"');
    expect(coreScript).not.toContain("Single official source");
    expect(coreSource).toMatch(
      /if \(evidence\.length > 1\) \{[\s\S]*?drawer-story[\s\S]*?buildDrawerJourney/,
    );
    expect(siteStyles).not.toContain("#17191f");
    expect(siteStyles).toMatch(/\[data-theme=(?:"paper"|paper)\] \.site-footer/);
    expect(siteStyles).toMatch(/\.tool-tabs\{[^}]*overflow-x:auto;[^}]*overflow-y:hidden/);
    expect(siteStyles).toContain("overscroll-behavior-y:contain");
    expect(siteStyles).toContain(".back-to-top");
    expect(siteStyles).toContain("[data-mobile-list-extra]");
    expect(siteStyles).toContain(
      ".trend-shift-header{display:grid;align-items:start;grid-template-columns:minmax(0,1fr) auto",
    );
    expect(siteStyles).toContain(".trend-shift-randomize{justify-self:end;min-height:44px}");
    expect(timelinePage).toContain('class="hero-motion hero-motion-timeline"');
    expect(timelinePage).toContain("事件脉络");
    expect(timelinePage).toContain("最近进展");
    expect(timelinePage).toContain('id="event-drawer"');
    expect(timelinePage).toContain('aria-haspopup="dialog"');
    expect(timelinePage).toContain('data-timeline-year="2026"');
    expect(timelinePage).toContain('data-timeline-year="2022"');
    expect(timelinePage).toContain("data-timeline-current-month");
    expect(timelinePage).toContain("data-timeline-year-select");
    expect(timelinePage).toContain("data-timeline-month-select");
    expect(timelinePage).toContain('data-timeline-label="7月"');
    expect(timelinePage).toContain('data-event="chatgpt-research-preview"');
    expect(timelinePage).toContain('data-filter-track="official"');
    expect(timelinePage).toContain('data-filter-track="research"');
    expect(timelinePage).toContain('data-research="true"');
    expect(timelinePage).not.toMatch(/data-category="(?:research|paper)" data-research="false"/);
    const researchGroups = [...timelinePage.matchAll(/本月精选 (\d+) 篇高质量研究/g)];
    expect(researchGroups.length).toBeGreaterThan(0);
    for (const group of researchGroups) {
      expect(Number(group[1])).toBeGreaterThan(0);
      expect(Number(group[1])).toBeLessThanOrEqual(10);
    }
    expect(timelinePage).toMatch(/本月精选 \d+ 篇高质量研究/);
    for (const event of directResearchHistory2026) {
      expect(timelinePage, event.slug).toContain(`data-event="${event.slug}"`);
      expect(timelinePage, event.date).toContain(`data-research-month="${event.date.slice(0, 7)}"`);
    }
    expect(timelinePage).not.toMatch(/research-month-group[^>]*data-month-extra/);
    expect(timelinePage).not.toContain("data-research-day");
    expect(timelinePage).not.toContain("同日论文组");
    expect(timelinePage).toContain("data-timeline-month-toggle");
    expect(timelinePage).toContain('data-month-extra="true"');
    expect(timelinePage).not.toContain("近三月密度");
    expect(timelinePage).not.toContain("论文批次状态");
    expect(timelinePage).toContain('data-recent="true"');
    for (const event of [...vendorHistoryEvents, ...ecosystemHistoryEvents]) {
      expect(timelinePage, event.slug).toContain(`data-event="${event.slug}"`);
    }
    for (const event of capitalHistoryEvents) {
      expect(timelinePage, event.slug).toContain(`data-event="${event.slug}"`);
    }
    const timelineSearchIndex = [...timelinePage.matchAll(/data-search="([^"]*)"/g)]
      .map((match) => match[1] ?? "")
      .join(" ")
      .toLowerCase();
    for (const alias of [
      "智谱",
      "zhipu",
      "glm",
      "grok",
      "xai",
      "字节跳动",
      "腾讯",
      "混元",
      "百度",
      "文心",
      "阶跃星辰",
      "零一万物",
      "百川",
      "面壁智能",
      "商汤",
      "科大讯飞",
      "cohere",
      "mistral",
      "perplexity",
    ]) {
      expect(timelineSearchIndex, alias).toContain(alias.toLowerCase());
    }
    for (const slug of [
      "predicatelongbench-long-context-difficulty",
      "compete-then-collaborate-multi-agent",
      "autopersonas-agent-simulation-diversity",
      "blind-spots-bench-vision-language",
      "overthinking-secret-leakage-reasoning-models",
      "causalds-causal-data-science-agents",
    ]) {
      expect(timelinePage).not.toContain(`data-event="${slug}"`);
      expect(await readFile(join(config.distDir, `events/${slug}/index.html`), "utf8")).toContain(
        "研究预印本",
      );
    }
    const linesPage = await readFile(join(config.distDir, "lines/index.html"), "utf8");
    expect(linesPage).toContain('class="hero-motion hero-motion-lines"');
    const overviewNav = linesPage.match(/<nav class="trend-switcher compact"[\s\S]*?<\/nav>/)?.[0];
    expect(overviewNav).toBeDefined();
    expect(overviewNav?.match(/class="trend-tab"/g)).toHaveLength(6);
    expect(overviewNav).not.toContain("行业演化");
    expect(overviewNav).toContain('href="../lines/"');
    expect(overviewNav).toContain('aria-current="page"');
    expect(linesPage).toContain("模型能力与研究");
    expect(linesPage).toContain('aria-label="六个趋势视角"');
    expect(linesPage).not.toContain("选择趋势");
    expect(linesPage).not.toContain("EVENT · 8 阶段");
    expect(linesPage).not.toContain('class="trend-switcher-panel');
    expect(linesPage).toContain('class="footer-subscriptions"');
    expect(linesPage).not.toContain('class="subscription-panel"');
    expect(linesPage).not.toContain("中国追赶");
    expect(linesPage).not.toContain("<h2>理解框架</h2>");
    expect(linesPage).toContain('href="../industry-evolution/"');
    const evolutionPage = await readFile(
      join(config.distDir, "industry-evolution/index.html"),
      "utf8",
    );
    expect(evolutionPage).toContain("行业演化");
    expect(evolutionPage).toContain("已收购");
    expect(evolutionPage).toContain("已停止");
    expect(evolutionPage).not.toContain('class="trend-switcher');
    const trendDetailPage = await readFile(
      join(config.distDir, "lines/tech-evolution/index.html"),
      "utf8",
    );
    const detailNav = trendDetailPage.match(
      /<nav class="trend-switcher compact"[\s\S]*?<\/nav>/,
    )?.[0];
    expect(detailNav?.match(/class="trend-tab"/g)).toHaveLength(6);
    expect(detailNav).toContain('aria-current="page"');
    expect(trendDetailPage).not.toContain("切换趋势");
    expect(trendDetailPage).not.toMatch(/<section class="stage-evidence-group">[\s\S]*?<dl>/);
    expect(trendDetailPage).not.toContain('class="trend-pulse"');
    expect(trendDetailPage).not.toContain("证据缺口");
    expect(trendDetailPage).not.toContain("中国实践");
    expect(trendDetailPage).not.toContain("这一阶段的中国实践");
    expect(trendDetailPage).toContain('class="section section-tint" data-no-scroll-reveal');
    expect(trendDetailPage).not.toContain("展示模式");
    expect(trendDetailPage).not.toContain("data-density-value");
    expect(trendDetailPage).not.toContain("data-density-extra");
    expect(trendDetailPage).toContain("data-module-expand");
    expect(trendDetailPage).toContain("展开轨迹");
    expect(trendDetailPage).toContain('class="module-expand-toggle section-module-toggle"');
    expect(trendDetailPage).toContain("展开完整判断");
    expect(trendDetailPage).toMatch(/查看全部 \d+ 条证据/);
    expect((trendDetailPage.match(/class="phase-sequence-index"/g) ?? []).length).toBeGreaterThan(
      8,
    );
    const actorsPage = await readFile(join(config.distDir, "actors/index.html"), "utf8");
    expect(actorsPage).toContain('class="hero-motion hero-motion-action"');
    expect(actorsPage).toContain("关键角色");
    expect(actorsPage).not.toContain("已收录角色 · 持续观测程度需回到事件证据");
    const actionTabs = actorsPage.match(/<nav class="tool-tabs"[\s\S]*?<\/nav>/)?.[0];
    expect(actionTabs?.match(/<a /g)).toHaveLength(3);
    expect(actionTabs).not.toContain("判断方法");
    const productPage = await readFile(join(config.distDir, "product/index.html"), "utf8");
    expect(productPage).toContain("核对事实");
    expect(productPage).toContain("标明内容性质");
    expect(productPage).toContain("持续校准");
    expect(productPage).not.toContain("STATE 1");
    const sourcesPage = await readFile(join(config.distDir, "sources/index.html"), "utf8");
    const signalsPage = await readFile(join(config.distDir, "signals/index.html"), "utf8");
    expect(signalsPage).toContain("来源动态");
    expect(signalsPage).not.toContain("来源观察 ≠ 已核实事实");
    expect(signalsPage).toContain('class="hero-motion hero-motion-signals"');
    expect(signalsPage).toContain('class="signal-stream"');
    expect(signalsPage).toContain('<a class="signal-observation-card');
    expect(signalsPage).toContain('class="signal-tag category"');
    expect(signalsPage).toContain('class="signal-source-name"');
    expect(signalsPage).toContain('class="signal-source-action"');
    expect(signalsPage).not.toContain('<article class="signal-observation-card"');
    expect(signalsPage).toContain("data-signal-browser");
    expect(signalsPage).toContain('data-mobile-page-size="12"');
    expect(signalsPage).toContain("data-signals-src");
    expect(signalsPage).toContain('class="signal-region-control"');
    expect(signalsPage).toContain('data-signal-region aria-label="按地域筛选"');
    expect(signalsPage).toContain("assets/icons.svg#chevron-down");
    expect(sourcesPage).toContain("核心观察者");
    expect(sourcesPage).toContain("宝玉");
    expect(sourcesPage).toContain("平台受限");
    expect(sourcesPage).toContain("Federal Reserve Economic Data (FRED)");
    expect(sourcesPage).toContain("SEC EDGAR APIs");
    expect(timelinePage).toContain("inert");
    expect(timelinePage).not.toContain("data-event-panel");
    expect(sourcesPage).toContain("覆盖与缺口");
    expect(sourcesPage).toContain('data-mobile-limit="12"');
    for (const domain of ["Claude Code", "OpenAI / Codex", "Lovable", "MCP", "A2A"]) {
      expect(sourcesPage).toContain(domain);
    }
    const eventSlug = JSON.parse(timeline).events[0].slug as string;
    const eventPage = await readFile(
      join(config.distDir, "events", eventSlug, "index.html"),
      "utf8",
    );
    expect(eventPage).toContain("发生了什么");
    expect(eventPage).toContain("发展脉络");
    expect(eventPage).toContain("当前判断");
    expect(eventPage).toContain("原始证据");
    const researchEventPage = await readFile(
      join(config.distDir, "events", "predicatelongbench-long-context-difficulty", "index.html"),
      "utf8",
    );
    expect(researchEventPage).toContain("研究预印本：方法和结果尚待独立复现");
    expect(researchEventPage).toContain("它提供了一条难度轴");
    const vendorEventPage = await readFile(
      join(config.distDir, "events", "seed-2-general-agent-models", "index.html"),
      "utf8",
    );
    expect(vendorEventPage).toContain("字节跳动 Seed");
    expect(vendorEventPage).toContain("为什么重要");
    expect(vendorEventPage).toContain("原始证据");
    const github = JSON.parse(await readFile(join(config.distDir, "data/github.json"), "utf8"));
    expect(github).toMatchObject({
      repositoryUrl: "https://github.com/barretlee/agent-pulse",
      stars: null,
      latestRelease: "v0.11.1",
    });
    const integrity = await validatePublicSite(config.distDir, "2026-07-14T00:00:00.000Z");
    expect(integrity.issues).toEqual([]);
    expect(integrity).toMatchObject({
      ok: true,
      counts: {
        events: result.events,
        signals: result.signals,
        scout: result.scout,
        sources: result.sources,
      },
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
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    });
    expect(health.headers["content-security-policy"]).toContain("default-src 'self'");
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
