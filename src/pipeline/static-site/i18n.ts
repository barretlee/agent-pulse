export type Locale = "zh-CN" | "en";

export const defaultLocale: Locale = "zh-CN";
export const localeNames: Record<Locale, string> = {
  "zh-CN": "zh-CN",
  en: "EN",
};
export const localePaths: Record<Locale, string> = {
  "zh-CN": "",
  en: "en/",
};

const translations: Record<string, Record<Locale, string>> = {
  // ─── Navigation ────────────────────────────────────────────
  "nav.home": { "zh-CN": "关键变化", en: "Latest Shifts" },
  "nav.lines": { "zh-CN": "趋势判断", en: "Industry Shifts" },
  "nav.timeline": { "zh-CN": "事件脉络", en: "Event Stories" },
  "nav.scout": { "zh-CN": "行动参考", en: "Action Ideas" },
  "nav.changelog": { "zh-CN": "Changelog", en: "Changelog" },
  "mobile.home": { "zh-CN": "变化", en: "Shifts" },
  "mobile.lines": { "zh-CN": "趋势", en: "Shifts" },
  "mobile.timeline": { "zh-CN": "脉络", en: "Stories" },
  "mobile.scout": { "zh-CN": "行动", en: "Actions" },
  "mobile.more": { "zh-CN": "来源", en: "Sources" },

  // ─── Brand ─────────────────────────────────────────────────
  "brand.subtitle": {
    "zh-CN": "AI 行业证据与趋势",
    en: "AI Industry Evidence & Trends",
  },
  "brand.aria": { "zh-CN": "Agent Pulse 首页", en: "Agent Pulse Home" },
  "brand.switchLang": { "zh-CN": "EN", en: "中文" },

  // ─── Skip link & helpers ───────────────────────────────────
  "ui.skipMain": { "zh-CN": "跳到主要内容", en: "Skip to main content" },
  "ui.toggleTheme": { "zh-CN": "切换主题", en: "Toggle theme" },
  "ui.footerNav": { "zh-CN": "页脚导航", en: "Footer navigation" },
  "ui.desktopNav": { "zh-CN": "主导航", en: "Main navigation" },
  "ui.mobileNav": { "zh-CN": "移动导航", en: "Mobile navigation" },

  // ─── Footer ────────────────────────────────────────────────
  "footer.tagline": { "zh-CN": "用证据看清 AI 行业变化。", en: "See AI clearly through evidence." },
  "footer.lines": { "zh-CN": "主线", en: "Strategic Lines" },
  "footer.timeline": { "zh-CN": "事件时间线", en: "Timeline" },
  "footer.scout": { "zh-CN": "行动参考", en: "Action Ideas" },
  "footer.sources": { "zh-CN": "覆盖与来源", en: "Coverage & Sources" },
  "footer.legal": { "zh-CN": "版权与纠错", en: "Legal & Corrections" },
  "footer.changelog": { "zh-CN": "Changelog", en: "Changelog" },
  "footer.principles": {
    "zh-CN": "一手来源优先 · 事实与判断分离 · 证据可追溯",
    en: "Primary sources first · Facts separated from analysis · Evidence traceable",
  },
  "footer.snapshot": { "zh-CN": "静态快照 {date}", en: "Static snapshot {date}" },
  "footer.contacts": { "zh-CN": "联系作者", en: "Contact" },

  // ─── Language switcher ─────────────────────────────────────
  "lang.label": { "zh-CN": "语言", en: "Language" },

  // ─── Home ──────────────────────────────────────────────────
  "home.brief": { "zh-CN": "LATEST MATERIAL SHIFT", en: "LATEST MATERIAL SHIFT" },
  "home.briefTitle": {
    "zh-CN": "最新关键变化",
    en: "Latest Material Shift",
  },
  "home.today": { "zh-CN": "LATEST SHIFT", en: "LATEST SHIFT" },
  "home.unknownEntity": { "zh-CN": "主体未知", en: "Unknown" },
  "home.factChecked": { "zh-CN": "发生了什么", en: "What Happened" },
  "home.evidenceCount": { "zh-CN": "{count} 条证据", en: "{count} pieces of evidence" },
  "home.sourceCount": {
    "zh-CN": "{count} 个独立来源",
    en: "{count} independent sources",
  },
  "home.verifyEvidence": { "zh-CN": "读完整判断", en: "Read the Full Assessment" },
  "home.viewTimeline": { "zh-CN": "查看事情如何发展", en: "See How It Developed" },
  "home.lensWhy": { "zh-CN": "为什么重要", en: "Why It Matters" },
  "home.lensWho": { "zh-CN": "影响谁", en: "Who It Affects" },
  "home.lensNext": { "zh-CN": "接下来观察", en: "What to Watch Next" },
  "home.emptyTitle": {
    "zh-CN": "当前没有需要更新判断的新变化。",
    en: "No new evidence currently changes the view.",
  },
  "home.emptyDesc": {
    "zh-CN": "我们仍在持续监测；只有新证据足以改变判断时，才会更新这里。",
    en: "Monitoring continues. This page updates when new evidence is strong enough to change the assessment.",
  },
  // Home — Strategic lines section
  "home.sectionLines": { "zh-CN": "04 / INDUSTRY SHIFTS", en: "04 / INDUSTRY SHIFTS" },
  "home.sectionLinesTitle": { "zh-CN": "行业趋势", en: "Industry Shifts" },

  // Home — Recent evidence section
  "home.sectionEvidence": { "zh-CN": "02 / ALSO WORTH KNOWING", en: "02 / ALSO WORTH KNOWING" },
  "home.sectionEvidenceTitle": { "zh-CN": "近期变化", en: "Recent Shifts" },
  "home.openTimeline": { "zh-CN": "查看所有事件的发展脉络", en: "Explore Every Event Story" },

  // Home — Research section
  "home.sectionResearch": { "zh-CN": "03 / RESEARCH FRONTIER", en: "03 / RESEARCH FRONTIER" },
  "home.sectionResearchTitle": {
    "zh-CN": "本周研究",
    en: "Research This Week",
  },
  "home.researchPreprint": { "zh-CN": "研究预印本", en: "Research preprint" },
  "home.researchMethod": { "zh-CN": "核心方法与结果", en: "Method and result" },
  "home.researchDecision": { "zh-CN": "对决策的意义", en: "Decision implication" },
  "home.readResearch": { "zh-CN": "查看研究解读", en: "Read the research brief" },
  "home.openResearch": { "zh-CN": "查看全部论文与研究", en: "Explore all papers and research" },
  "home.researchEmpty": { "zh-CN": "暂无通过审核的研究", en: "No reviewed research yet" },
  "home.researchEmptyDesc": {
    "zh-CN": "候选论文仍在核验方法、证据和决策价值。",
    en: "Candidate papers are still being checked for method, evidence, and decision value.",
  },

  // Home — Decision tools section
  "home.sectionTools": { "zh-CN": "05 / FORM YOUR VIEW", en: "05 / FORM YOUR VIEW" },
  "home.sectionToolsTitle": {
    "zh-CN": "形成判断",
    en: "Form a View",
  },

  // Home — Product section
  "home.sectionProduct": { "zh-CN": "06 / PRODUCT EVOLUTION", en: "06 / PRODUCT EVOLUTION" },
  "home.sectionProductTitle": { "zh-CN": "最近发生了哪些变化", en: "What's Changed Recently" },
  "home.sectionProductDesc": {
    "zh-CN": "Changelog 记录每次更新带来的实际变化。",
    en: "The changelog records the practical changes delivered in each update.",
  },
  "home.viewChangelog": {
    "zh-CN": "查看完整产品演进",
    en: "View Full Product Evolution",
  },

  // Home — GitHub CTA
  "home.githubLabel": {
    "zh-CN": "OPEN INTELLIGENCE INFRASTRUCTURE",
    en: "OPEN INTELLIGENCE INFRASTRUCTURE",
  },
  "home.githubTitle": { "zh-CN": "一起补全证据", en: "Help Strengthen the Evidence" },
  "home.githubDesc": {
    "zh-CN": "查看实现、提出来源、纠正事实，或用一个 Star 让更多人发现这个项目。",
    en: "View the implementation, suggest sources, correct facts, or help others discover this project with a Star.",
  },
  "home.starOnGitHub": { "zh-CN": "Star on GitHub", en: "Star on GitHub" },

  // Home — Manifesto
  "home.manifestoTitle": {
    "zh-CN": "追踪关键事实。<em>看清变化方向。</em>",
    en: "Follow the facts that matter.<em> See where the industry is heading.</em>",
  },
  "home.manifestoDesc": {
    "zh-CN":
      "从一手事实出发，沿模型能力、Agent、产品商业、基础设施、资本与全球创新六个方向，找出会影响决策的行业转折。",
    en: "Start with primary facts. Follow models, agents, products, infrastructure, capital, and global innovation to find the inflections that change decisions.",
  },
  "home.principle1": { "zh-CN": "一手来源优先", en: "Primary sources first" },
  "home.principle2": {
    "zh-CN": "事实 / 分析 / 预测分层",
    en: "Facts / Analysis / Forecasts layered",
  },
  "home.principle3": { "zh-CN": "证据可追溯", en: "Evidence traceable" },

  // Home — Gateway cards
  "home.gatewayScout": { "zh-CN": "把变化转成行动", en: "Turn Change into Action" },
  "home.gatewayScoutStat": { "zh-CN": "{count} 条待验证假设", en: "{count} hypotheses to verify" },
  "home.gatewayScoutDesc": {
    "zh-CN": "把变化转成创业、内容与工作实验。",
    en: "Turn changes into venture, content, and work experiments.",
  },
  "home.gatewayActors": { "zh-CN": "看清谁在推动变化", en: "See Who Is Driving Change" },
  "home.gatewayActorsStat": { "zh-CN": "{count} 个角色", en: "{count} actors" },
  "home.gatewayActorsDesc": {
    "zh-CN": "查看关键公司与人物在推进什么，以及现有证据是否充分。",
    en: "See what key companies and people are advancing, and whether the available evidence is strong enough.",
  },
  "home.gatewayResources": { "zh-CN": "核对选型与真实成本", en: "Check Options and Real Costs" },
  "home.gatewayResourcesStat": {
    "zh-CN": "{count} 个购买入口",
    en: "{count} purchase options",
  },
  "home.gatewayResourcesDesc": {
    "zh-CN": "在同一页比较价格、计费单位、核验时间和风险。",
    en: "Compare prices, billing units, verification dates, and risks on one page.",
  },
  "home.gatewayProduct": { "zh-CN": "了解我们如何得出判断", en: "See How We Reach a Judgment" },
  "home.gatewayProductStat": { "zh-CN": "{count} 项能力", en: "{count} capabilities" },
  "home.gatewayProductDesc": {
    "zh-CN": "公开判断方法、证据边界，以及目前还不够可靠的地方。",
    en: "See the method, evidence boundaries, and what is not yet reliable enough.",
  },
  "home.enterTool": { "zh-CN": "继续了解", en: "Continue" },

  // Home — Coverage bar
  "home.coveragePrimary": { "zh-CN": "一手覆盖", en: "Primary Coverage" },
  "home.coverageEvents": { "zh-CN": "公开事件", en: "Public Events" },
  "home.coverageMulti": { "zh-CN": "一手 + 多源", en: "Primary + Multi-source" },
  "home.coverageSpan": { "zh-CN": "观察跨度", en: "Observation Span" },

  // ─── Lines ─────────────────────────────────────────────────
  "lines.heroTitle": {
    "zh-CN": "六个视角",
    en: "Six Perspectives",
  },
  "lines.heroDesc": {
    "zh-CN": "在一页中查看每个趋势的阶段、证据、决策影响和后续观察点。",
    en: "See each trend's phases, evidence, decision impact, and next watchpoints on one page.",
  },
  "lines.statusEvents": { "zh-CN": "{count} 个公开事件", en: "{count} public events" },
  "lines.selectLine": { "zh-CN": "选择一条主线开始", en: "Pick a line to start" },
  "lines.arcTitle": {
    "zh-CN": "行业演化",
    en: "Industry Evolution",
  },
  "lines.howTitle": {
    "zh-CN": "理解框架",
    en: "Reading Framework",
  },
  "lines.flowTech": { "zh-CN": "技术能力", en: "Technology" },
  "lines.flowProduct": { "zh-CN": "产品阈值", en: "Product Threshold" },
  "lines.flowBusiness": { "zh-CN": "商业验证", en: "Business Validation" },
  "lines.flowCapital": { "zh-CN": "资本与竞争", en: "Capital & Competition" },

  // Lines — detail
  "lines.phases": { "zh-CN": "01 / PHASES", en: "01 / PHASES" },
  "lines.phasesTitle": { "zh-CN": "阶段轨迹", en: "Phase Trajectory" },
  "lines.phasesDesc": {
    "zh-CN": "每个趋势按时间分为不同阶段。横向滚动查看阶段，具体事实请以关联事件和原始资料为准。",
    en: "Each trend is divided into phases over time. Scroll horizontally and verify the details in the linked events and source material.",
  },
  "lines.evidenceSpine": { "zh-CN": "02 / EVIDENCE SPINE", en: "02 / EVIDENCE SPINE" },
  "lines.evidenceSpineTitle": { "zh-CN": "阶段证据", en: "Phase Evidence" },
  "lines.evidenceSpineDesc": {
    "zh-CN": "{count} 个公开事件按阶段排列。默认每个阶段显示两个，展开后可查看全部。",
    en: "{count} public events grouped by phase. Two are shown by default; expand a phase to see the rest.",
  },
  "lines.lenses": { "zh-CN": "03 / DECISION LENSES", en: "03 / DECISION LENSES" },
  "lines.lensesTitle": { "zh-CN": "角色判断", en: "Decision Lenses" },
  "lines.lensesDesc": {
    "zh-CN": "按角色查看结论、影响、建议动作、后续观察点和相关证据。请结合自身情况独立决策。",
    en: "For each role, review the conclusion, implications, suggested actions, watchpoints, and supporting evidence. Apply your own judgment.",
  },
  "lines.chinaSection": { "zh-CN": "CHINA / GLOBAL", en: "CHINA / GLOBAL" },
  "lines.chinaTitle": {
    "zh-CN": "中国实践",
    en: "China in Practice",
  },
  "lines.sparse": {
    "zh-CN": "当前只有 {count} 个公开节点，仍属于证据稀疏主线。",
    en: "Currently only {count} public nodes — still an evidence-sparse line.",
  },
  "lines.waitingNext": {
    "zh-CN": "等待能改变当前判断的官方原始资料。",
    en: "Awaiting official source material that could change the current thesis.",
  },
  "lines.judgmentLabel": { "zh-CN": "当前判断 · 系统分析", en: "Current Thesis · System Analysis" },
  "lines.nextLabel": { "zh-CN": "下一观察 · 待验证", en: "Next Observation · To Verify" },
  "lines.noChinaPosition": {
    "zh-CN": "当前没有经过审核的同维度对比。",
    en: "No reviewed comparison available for this dimension.",
  },
  "lines.noStages": {
    "zh-CN": "当前主线尚无阶段叙事。",
    en: "No phase narrative for this line yet.",
  },
  "lines.noEvidence": { "zh-CN": "暂无官方原始资料节点。", en: "No official source nodes yet." },
  "lines.viewTimeline": {
    "zh-CN": "在时间轴查看全部节点",
    en: "View all nodes on the timeline",
  },
  "lines.openLine": { "zh-CN": "查看趋势详情", en: "Explore This Trend" },
  "lines.nodes": { "zh-CN": "{count} 节点", en: "{count} nodes" },
  "lines.latest": { "zh-CN": "最新 · {date}", en: "Latest · {date}" },
  "lines.waitingEvidence": { "zh-CN": "证据待补", en: "Evidence pending" },
  "lines.nextWait": { "zh-CN": "等待新证据", en: "Waiting for new evidence" },
  "lines.evidenceNodes": {
    "zh-CN": "{count} EVIDENCE NODES",
    en: "{count} EVIDENCE NODES",
  },
  "lines.verifyEvidence": { "zh-CN": "沿阶段核验证据", en: "Verify evidence by phase" },
  "lines.openSourceMap": { "zh-CN": "查看来源地图", en: "View Source Map" },
  "lines.navAria": { "zh-CN": "六个趋势方向", en: "Strategic trends" },

  // Lines — role lenses
  "lines.lensCEO": { "zh-CN": "CEO", en: "CEO" },
  "lines.lensCEOQ": {
    "zh-CN": "这会改变哪个控制点？",
    en: "Which control point does this change?",
  },
  "lines.lensInvestor": { "zh-CN": "投资负责人", en: "Investor" },
  "lines.lensInvestorQ": {
    "zh-CN": "价值向哪一层迁移？",
    en: "Which layer is value migrating to?",
  },
  "lines.lensCTO": { "zh-CN": "技术负责人", en: "CTO" },
  "lines.lensCTOQ": {
    "zh-CN": "能力与工程边界如何变化？",
    en: "How are capabilities and engineering boundaries shifting?",
  },
  "lines.lensPM": { "zh-CN": "产品负责人", en: "Product Lead" },
  "lines.lensPMQ": {
    "zh-CN": "下一验证信号是什么？",
    en: "What's the next validation signal?",
  },
  "lines.noJudgment": {
    "zh-CN": "当前证据不足，暂不形成强判断。",
    en: "Insufficient evidence for a strong judgment at this time.",
  },

  // ─── Timeline ──────────────────────────────────────────────
  "timeline.heroTitle": {
    "zh-CN": "事件脉络",
    en: "Event Stories",
  },
  "timeline.heroDesc": {
    "zh-CN":
      "同一事件的首次报道、官方更新、外部讨论和行业反馈会按时间排列，最近有进展的事件优先显示。",
    en: "First reports, official updates, external discussion, and industry responses are arranged chronologically. Recently updated events appear first.",
  },
  "timeline.statusEvents": { "zh-CN": "{count} 个公开事件", en: "{count} public events" },
  "timeline.statusPrimary": {
    "zh-CN": "{count} 个有官方原始资料",
    en: "{count} backed by official material",
  },
  "timeline.statusHint": { "zh-CN": "搜索或选择主线", en: "Search or select a line" },
  "timeline.searchPlaceholder": {
    "zh-CN": "搜索主体、技术、事件或关键词",
    en: "Search company, topic, event, or keyword",
  },
  "timeline.filterAll": { "zh-CN": "全部变化", en: "All Changes" },
  "timeline.filterPrimary": { "zh-CN": "官方发布", en: "Official Releases" },
  "timeline.filterResearch": { "zh-CN": "论文与研究", en: "Papers & Research" },
  "timeline.nodes": { "zh-CN": "{count} 个事件", en: "{count} events" },
  "timeline.monthEvents": { "zh-CN": "{count} 个事件", en: "{count} events" },
  "timeline.selectYear": { "zh-CN": "选择时间轴年份", en: "Select timeline year" },
  "timeline.selectMonth": { "zh-CN": "选择时间轴月份", en: "Select timeline month" },
  "timeline.drawerLabel": { "zh-CN": "事件详情抽屉", en: "Event detail drawer" },
  "timeline.drawerKicker": { "zh-CN": "事件判断", en: "EVENT ASSESSMENT" },
  "timeline.closePreview": { "zh-CN": "关闭预览", en: "Close preview" },
  "timeline.pendingTrack": { "zh-CN": "待编排", en: "Unassigned" },
  "timeline.searchLabel": { "zh-CN": "时间轴筛选", en: "Timeline filter" },
  "timeline.developments": { "zh-CN": "{count} 次进展", en: "{count} developments" },
  "timeline.latestUpdate": { "zh-CN": "最近进展 {date}", en: "Latest update {date}" },
  "timeline.scoresDisclaimer": {
    "zh-CN": "分数仅用于排序，请结合原始证据判断。",
    en: "Scores are used for ranking only. Review the source evidence before drawing conclusions.",
  },
  "timeline.noActors": { "zh-CN": "暂无角色关联", en: "No related actors" },
  "timeline.researchDigest": { "zh-CN": "当月论文组", en: "Monthly Research Group" },
  "timeline.researchDigestCount": {
    "zh-CN": "本月精选 {count} 篇高影响研究",
    en: "{count} high-impact papers selected this month",
  },
  "timeline.researchDigestFallback": {
    "zh-CN": "展开查看全部研究事件",
    en: "Expand to view every research event",
  },
  "timeline.expandResearch": { "zh-CN": "展开全部论文", en: "Expand all papers" },
  "timeline.expandMonth": { "zh-CN": "展开本月更多变化", en: "Show more this month" },
  "timeline.collapseMonth": { "zh-CN": "收起本月", en: "Collapse this month" },
  "timeline.lazyMonth": {
    "zh-CN": "本月 {count} 个事件将在接近视口时加载",
    en: "{count} events will load as this month approaches the viewport",
  },
  "timeline.loadMonth": { "zh-CN": "立即加载本月", en: "Load this month now" },

  // ─── Event ─────────────────────────────────────────────────
  "event.breadcrumb": { "zh-CN": "证据时间轴", en: "Evidence Timeline" },
  "event.categoryGeneral": { "zh-CN": "行业事件", en: "Industry Event" },
  "event.unknownEntity": { "zh-CN": "主体未知", en: "Unknown Entity" },
  "event.factStatement": { "zh-CN": "发生了什么", en: "What Happened" },
  "event.analysis": { "zh-CN": "改变了什么", en: "What Changed" },
  "event.technical": { "zh-CN": "能力边界怎么变了", en: "How the Capability Boundary Shifted" },
  "event.industry": { "zh-CN": "为什么重要", en: "Why It Matters" },
  "event.businessValue": { "zh-CN": "对谁有影响", en: "Who It Affects" },
  "event.watchNext": { "zh-CN": "接下来观察", en: "What to Watch Next" },
  "event.estimates": { "zh-CN": "系统估计", en: "System Estimates" },
  "event.credibility": { "zh-CN": "可信度", en: "Credibility" },
  "event.heat": { "zh-CN": "传播热度", en: "Heat" },
  "event.impact": { "zh-CN": "行业影响", en: "Industry Impact" },
  "event.value": { "zh-CN": "决策价值", en: "Decision Value" },
  "event.scoreDisclaimer": {
    "zh-CN": "分数仅用于排序，请结合原始证据判断。",
    en: "Scores are used for ranking only. Review the source evidence before drawing conclusions.",
  },
  "event.evidence": { "zh-CN": "原始证据", en: "Source Evidence" },
  "event.relatedActors": { "zh-CN": "相关角色", en: "Related Actors" },
  "event.noActors": { "zh-CN": "暂无角色关联", en: "No related actors" },
  "event.openEvent": { "zh-CN": "打开完整事件", en: "Open Full Event" },
  "event.sourceEvidence": { "zh-CN": "原始证据", en: "Source Evidence" },
  "event.relatedSection": { "zh-CN": "相关事件", en: "Related Events" },
  "event.relatedDesc": {
    "zh-CN": "相邻事件共享主线，但事实和证据保持独立。",
    en: "Adjacent events share the line, but facts and evidence remain independent.",
  },
  "event.noRelated": { "zh-CN": "暂无相关公开事件。", en: "No related public events." },
  "event.evidenceCount": { "zh-CN": "{count} 条证据", en: "{count} pieces of evidence" },
  "event.developmentTitle": { "zh-CN": "发展脉络", en: "Development" },
  "event.developmentDesc": {
    "zh-CN": "同一事件的事实更新按时间排列；末尾的“当前判断”由 Agent Pulse 根据这些证据整理。",
    en: "Updates to the same event are arranged chronologically. The final current assessment is Agent Pulse's analysis of that evidence.",
  },
  "event.developmentOrigin": { "zh-CN": "首次出现", en: "First Report" },
  "event.developmentOfficial": { "zh-CN": "官方更新", en: "Official Update" },
  "event.developmentDiscussion": { "zh-CN": "外部讨论", en: "External Discussion" },
  "event.developmentResponse": { "zh-CN": "行业反馈", en: "Industry Response" },
  "event.currentAssessment": { "zh-CN": "当前判断", en: "Current Assessment" },
  "event.untracked": { "zh-CN": "待编排主线", en: "Untracked" },
  "event.pendingEvidence": { "zh-CN": "证据待补", en: "Evidence pending" },
  "event.researchNoticeTitle": {
    "zh-CN": "研究预印本：方法和结果尚待独立复现",
    en: "Research preprint: method and results await independent replication",
  },
  "event.researchNoticeDesc": {
    "zh-CN": "以下内容区分论文报告、Agent Pulse 分析与后续验证项，不把单篇预印本直接视为行业共识。",
    en: "The brief separates reported findings, Agent Pulse analysis, and open validation items. A single preprint is not treated as industry consensus.",
  },

  // ─── Scout ─────────────────────────────────────────────────
  "scout.heroTitle": { "zh-CN": "行动参考", en: "Action Ideas" },
  "scout.heroDesc": {
    "zh-CN": "把行业变化转成可以在 7–30 天验证的创业、内容、工作、学习、产物与影响力实验。",
    en: "Turn industry changes into venture, media, work, learning, artifact, and influence experiments you can validate in 7–30 days.",
  },
  "scout.statusHypotheses": { "zh-CN": "{count} 条公开假设", en: "{count} public hypotheses" },
  "scout.statusDisclaimer": { "zh-CN": "假设，不是事实", en: "Hypotheses, not facts" },
  "scout.filterAll": { "zh-CN": "全部", en: "All" },
  "scout.filterVenture": { "zh-CN": "创业", en: "Venture" },
  "scout.filterMedia": { "zh-CN": "内容", en: "Media" },
  "scout.filterWork": { "zh-CN": "工作", en: "Work" },
  "scout.filterLearning": { "zh-CN": "学习", en: "Learning" },
  "scout.filterArtifact": { "zh-CN": "产物", en: "Artifact" },
  "scout.filterInfluence": { "zh-CN": "影响力", en: "Influence" },
  "scout.empty": {
    "zh-CN": "暂无达到公开门槛的机会假设。",
    en: "No opportunity hypotheses meet the publication threshold yet.",
  },

  // ─── Actors ────────────────────────────────────────────────
  "actors.heroTitle": { "zh-CN": "关键角色", en: "Key Actors" },
  "actors.heroDesc": {
    "zh-CN": "按公司与机构查看其领域、规模和公开入口。",
    en: "Browse companies and institutions by focus, scale, and official links.",
  },
  "actors.statusActors": { "zh-CN": "{count} 个角色", en: "{count} actors" },
  "actors.statusChina": { "zh-CN": "{count} 个中国角色", en: "{count} China-based actors" },
  "actors.filterAll": { "zh-CN": "全部", en: "All" },
  "actors.filterChina": { "zh-CN": "中国", en: "China" },
  "actors.filterGlobal": { "zh-CN": "全球", en: "Global" },
  "actors.filterUS": { "zh-CN": "美国", en: "US" },
  "actors.domainUnknown": { "zh-CN": "领域待补", en: "Domain TBD" },
  "actors.website": { "zh-CN": "官方网站", en: "Official Website" },

  // ─── Resources ─────────────────────────────────────────────
  "resources.heroTitle": { "zh-CN": "模型成本", en: "Model Costs" },
  "resources.heroDesc": {
    "zh-CN": "把价格、单位、核验时点和官方入口放在一起；第三方比价只作参考。",
    en: "Price, unit, verification date, and official links on one screen. Third-party comparisons are for reference only.",
  },
  "resources.statusCount": { "zh-CN": "{count} 个资源", en: "{count} resources" },
  "resources.statusCheck": { "zh-CN": "购买前重新核验", en: "Re-verify before purchase" },
  "resources.legalNote": {
    "zh-CN": "价格代表页面标注的核验时点，不构成采购、投资或财务建议。",
    en: "Prices reflect the verification date noted on each listing and do not constitute purchasing, investment, or financial advice.",
  },
  "resources.official": { "zh-CN": "官方", en: "Official" },
  "resources.reference": { "zh-CN": "参考", en: "Reference" },
  "resources.input": { "zh-CN": "Input", en: "Input" },
  "resources.output": { "zh-CN": "Output", en: "Output" },
  "resources.verified": { "zh-CN": "核验 {date}", en: "Verified {date}" },
  "resources.officialLink": { "zh-CN": "官方入口", en: "Official Link" },
  "resources.priceSource": { "zh-CN": "价格证据", en: "Price Source" },
  "resources.inquire": { "zh-CN": "按方案询价", en: "Contact for pricing" },

  // ─── Product ───────────────────────────────────────────────
  "product.heroTitle": { "zh-CN": "判断方法", en: "Method" },
  "product.heroDesc": {
    "zh-CN": "查看公开事实如何经过核验，形成趋势判断。每一步都附有证据。",
    en: "See how public facts are verified and turned into trend assessments, with evidence at every step.",
  },
  "product.statusScore": { "zh-CN": "{score}/100 校准分", en: "{score}/100 Calibrated" },
  "product.statusPending": { "zh-CN": "评测待生成", en: "Evaluation Pending" },
  "product.statusCapabilities": { "zh-CN": "{count} 项能力", en: "{count} capabilities" },
  "product.metricVersion": { "zh-CN": "版本", en: "Version" },
  "product.metricSources": { "zh-CN": "来源目录", en: "Source Catalog" },
  "product.metricObserving": { "zh-CN": "E3 观察", en: "E3 Observing" },
  "product.metricCoverage": { "zh-CN": "证据覆盖", en: "Evidence Coverage" },
  "product.evalTitle": {
    "zh-CN": "评测依据",
    en: "Evaluation Basis",
  },
  "product.evalDesc": {
    "zh-CN": "同时公开原始分、校准分、样本量和扣分项。",
    en: "Raw scores, calibrated scores, sample sizes, and penalties are published together.",
  },
  "product.capabilityTitle": { "zh-CN": "能力图谱", en: "Capability Map" },
  "product.capabilityDesc": {
    "zh-CN": "区分已经可用、仍在试验和计划中的能力。",
    en: "Capabilities are labeled as operational, experimental, or planned.",
  },
  "product.roadmapTitle": { "zh-CN": "演进路线", en: "Roadmap" },
  "product.roadmapDesc": {
    "zh-CN": "每个阶段都列出目标和验收节点。",
    en: "Each stage lists its goals and acceptance milestones.",
  },
  "product.evalEmpty": { "zh-CN": "暂无评测结果。", en: "No evaluation results yet." },
  "product.nextAction": { "zh-CN": "下一步", en: "Next Step" },
  "product.hardCap": { "zh-CN": "硬上限", en: "Hard Cap" },
  "product.sample": { "zh-CN": "样本", en: "Sample" },

  // ─── Changelog ─────────────────────────────────────────────
  "changelog.heroTitle": { "zh-CN": "Changelog", en: "Changelog" },
  "changelog.heroDesc": {
    "zh-CN": "查看每个版本增加了什么、改善了哪些体验，以及相关指标如何变化。",
    en: "See what each release added, which experiences improved, and how the related metrics changed.",
  },
  "changelog.status": { "zh-CN": "{count} 条版本记录", en: "{count} release entries" },
  "changelog.current": { "zh-CN": "当前 v{version}", en: "Current v{version}" },
  "changelog.nav": { "zh-CN": "沿版本轨道回看", en: "Trace the release track" },
  "changelog.latest": { "zh-CN": "LATEST RELEASE", en: "LATEST RELEASE" },
  "changelog.inDevelopment": { "zh-CN": "开发中", en: "IN DEVELOPMENT" },
  "changelog.next": { "zh-CN": "NEXT", en: "NEXT" },
  "changelog.release": { "zh-CN": "RELEASE", en: "RELEASE" },
  "changelog.capabilities": { "zh-CN": "新增能力", en: "New Capabilities" },
  "changelog.changes": { "zh-CN": "实际变化", en: "What Changed" },

  // ─── Sources ───────────────────────────────────────────────
  "sources.heroTitle": {
    "zh-CN": "来源覆盖",
    en: "Source Coverage",
  },
  "sources.heroDesc": {
    "zh-CN":
      "先查看各技术领域覆盖了多少来源，再核对来源最近是否正常运行。目录中的来源可能仍在验证，尚未进入持续观测。",
    en: "Start with source coverage by technology, then check whether each source is running normally. Some catalog entries are still being validated and are not yet monitored continuously.",
  },
  "sources.portfolioTitle": { "zh-CN": "来源组合", en: "Source Portfolio" },
  "sources.portfolioDesc": {
    "zh-CN":
      "按领域、地区、采集方式和最近运行状态查看来源构成。新增来源需要通过隔离验证并持续产出有效信号，才能改善覆盖。",
    en: "Review the source mix by domain, region, acquisition method, and recent runtime status. New sources improve coverage only after isolated validation and sustained useful output.",
  },
  "sources.portfolioCategory": { "zh-CN": "领域分布", en: "Domains" },
  "sources.portfolioRegion": { "zh-CN": "地域分布", en: "Regions" },
  "sources.portfolioChannel": { "zh-CN": "采集通道", en: "Acquisition" },
  "sources.portfolioRuntime": { "zh-CN": "运行状态", en: "Runtime" },
  "sources.coverageKicker": { "zh-CN": "TECH COVERAGE CHECK", en: "TECH COVERAGE CHECK" },
  "sources.coverageTitle": {
    "zh-CN": "覆盖与缺口",
    en: "Coverage Gaps",
  },
  "sources.coverageDesc": {
    "zh-CN":
      "目录数量只能说明已经找到多少来源。下面结合最近运行状态、渠道类型和缺失项评估实际覆盖。",
    en: "Catalog size shows how many sources have been identified. Actual coverage also depends on recent health, channel diversity, and remaining gaps.",
  },
  "sources.coverageCovered": { "zh-CN": "覆盖较完整", en: "Well Covered" },
  "sources.coverageWatch": { "zh-CN": "需要补强", en: "Needs Strengthening" },
  "sources.coverageGap": { "zh-CN": "存在缺口", en: "Coverage Gap" },
  "sources.coverageUnchecked": { "zh-CN": "等待验证", en: "Awaiting Validation" },
  "sources.coverageSourceCount": { "zh-CN": "{count} 个相关来源", en: "{count} relevant sources" },
  "sources.coverageHealthyCount": { "zh-CN": "{count} 个最近健康", en: "{count} recently healthy" },
  "sources.coverageMissing": { "zh-CN": "还缺", en: "Still missing" },
  "sources.coverageNext": { "zh-CN": "下一步补强", en: "Next coverage action" },
  "sources.catalogTitle": {
    "zh-CN": "来源状态",
    en: "Source Status",
  },
  "sources.catalogDesc": {
    "zh-CN": "可按名称、领域或地域搜索。健康状态取自最近一次实际检查。",
    en: "Search by name, domain, or region. Health status comes from the latest live check.",
  },
  "sources.statusTotal": { "zh-CN": "{total} 个目录源", en: "{total} catalog sources" },
  "sources.statusObserving": { "zh-CN": "{total} 个 E3 观察", en: "{total} E3 observing" },
  "sources.statusActive": { "zh-CN": "{total} 个 E4 active", en: "{total} E4 active" },
  "sources.levelE0Desc": { "zh-CN": "已记录名称和入口", en: "Name and endpoint recorded" },
  "sources.levelE1Desc": { "zh-CN": "当前可访问", en: "Currently accessible" },
  "sources.levelE2Desc": {
    "zh-CN": "内容与质量检查通过",
    en: "Content and quality checks passed",
  },
  "sources.levelE3Desc": {
    "zh-CN": "隔离观察，暂不用于公开事实",
    en: "Observed in isolation, not yet used for public facts",
  },
  "sources.levelE4Desc": {
    "zh-CN": "持续验证并通过自动检查",
    en: "Continuously validated with automated checks",
  },
  "sources.searchPlaceholder": {
    "zh-CN": "搜索来源、地区、类型",
    en: "Search sources, region, or type",
  },
  "sources.filterAll": { "zh-CN": "全部", en: "All" },
  "sources.filterActive": { "zh-CN": "Active", en: "Active" },
  "sources.filterObserving": { "zh-CN": "E3 观察", en: "E3 Observing" },
  "sources.filterChina": { "zh-CN": "中国", en: "China" },
  "sources.contributeTitle": {
    "zh-CN": "推荐来源",
    en: "Suggest a Source",
  },
  "sources.contributeDesc": {
    "zh-CN":
      "建议提交后会检查 URL 安全、重复内容、使用许可和采集结果，并先进入隔离观察。提交 Issue 不会直接启用来源。",
    en: "After submission, suggestions are checked for URL safety, duplicates, licensing, and collection quality before isolated observation. Filing an issue does not activate a source directly.",
  },
  "sources.contributeButton": { "zh-CN": "提出来源建议", en: "Suggest a Source" },
  "sources.ariaOpen": { "zh-CN": "打开 {name}", en: "Open {name}" },

  // ─── Legal ─────────────────────────────────────────────────
  "legal.heroTitle": {
    "zh-CN": "版权与引用",
    en: "Copyright & Citations",
  },
  "legal.heroDesc": {
    "zh-CN": "Agent Pulse 只发布必要的资料信息、少量摘录和原创分析，不转载第三方全文。",
    en: "Agent Pulse publishes only essential metadata, brief excerpts, and original analysis. It does not republish third-party works in full.",
  },
  "legal.statusCode": { "zh-CN": "代码 MIT", en: "Code MIT" },
  "legal.statusThirdParty": { "zh-CN": "第三方权利保留", en: "Third-party rights reserved" },
  "legal.statusCorrection": {
    "zh-CN": "可纠错、署名或下架",
    en: "Corrections, attribution & takedown available",
  },
  "legal.navScope": { "zh-CN": "许可边界", en: "License Scope" },
  "legal.navSources": { "zh-CN": "来源与引用", en: "Sources & Citations" },
  "legal.navCorrection": { "zh-CN": "纠错与下架", en: "Corrections & Takedown" },
  "legal.navDisclaimer": { "zh-CN": "免责声明", en: "Disclaimer" },
  "legal.navIcons": { "zh-CN": "图标许可", en: "Icon License" },
  "legal.scopeTitle": { "zh-CN": "许可边界", en: "License Scope" },
  "legal.scopeDesc": {
    "zh-CN":
      "仓库中的源代码和明确标记的项目自有文档适用仓库 LICENSE。第三方标题、论文、新闻、博客、Release、商标、Logo 与其他材料的权利归各自权利人；MIT 不授予第三方内容使用权。",
    en: "Source code and clearly marked project documentation are covered by the repo LICENSE. Third-party titles, papers, news, blogs, releases, trademarks, logos, and other materials retain their respective owners' rights. MIT does not grant usage rights to third-party content.",
  },
  "legal.sourcesTitle": {
    "zh-CN": "引用原则",
    en: "Citation Policy",
  },
  "legal.sourcesDesc": {
    "zh-CN":
      "公开事件使用原创事实摘要和分析，并链接到原始资料。来源全文、付费或登录后内容、cookie、原始采集数据和内部样本不会发布到公开站。",
    en: "Public events use original fact summaries and analysis with links to the original material. Full source text, paywalled or authenticated content, cookies, raw collection data, and internal samples are never published on the public site.",
  },
  "legal.correctionTitle": {
    "zh-CN": "纠错与下架",
    en: "Corrections & Takedown",
  },
  "legal.correctionDesc": {
    "zh-CN":
      "如果事实、署名、链接或版权边界存在问题，请通过 GitHub Issue 提交具体 URL、理由和可验证证据。维护者会记录修订，而不是静默覆盖历史。",
    en: "If facts, attribution, links, or copyright boundaries have issues, submit the specific URL, rationale, and verifiable evidence via a GitHub Issue. Maintainers will record revisions rather than silently overwriting history.",
  },
  "legal.correctionButton": {
    "zh-CN": "提交纠错或下架请求",
    en: "Submit Correction or Takedown Request",
  },
  "legal.disclaimerTitle": {
    "zh-CN": "使用边界",
    en: "Usage Boundaries",
  },
  "legal.disclaimerDesc": {
    "zh-CN":
      "评分是系统估计，预测和机会是假设。模型价格、来源状态与行业判断只代表标注时点，使用者应核验原始证据并独立决策。",
    en: "Scores are system estimates. Forecasts and opportunities are hypotheses. Model prices, source status, and industry judgments reflect the noted date. Users should verify original evidence and decide independently.",
  },
  "legal.iconsTitle": {
    "zh-CN": "图标许可",
    en: "Icon License",
  },
  "legal.iconsDesc": {
    "zh-CN":
      "界面图标使用本地 vendoring 的 Lucide 子集，许可与版本说明随静态资产一同发布。站点不在运行时加载远程 iconfont 或网络 SVG。",
    en: "UI icons use a locally vendored Lucide subset. License and version notes ship with static assets. The site does not load remote icon fonts or network SVGs at runtime.",
  },
  "legal.viewNotices": {
    "zh-CN": "查看第三方许可说明",
    en: "View Third-Party Notices",
  },

  // ─── 404 ───────────────────────────────────────────────────
  "notFound.title": { "zh-CN": "页面未找到 · Agent Pulse", en: "Page Not Found · Agent Pulse" },
  "notFound.desc": {
    "zh-CN": "这个页面不存在或已经移动。",
    en: "This page doesn't exist or has moved.",
  },
  "notFound.heading": {
    "zh-CN": "信号不存在",
    en: "Signal Not Found",
  },
  "notFound.body": {
    "zh-CN": "页面可能已经移动、合并或撤回。你可以回到关键变化，或沿主线继续阅读。",
    en: "The page may have been moved, merged, or removed. Return to the latest shifts or continue reading along a strategic line.",
  },
  "notFound.home": { "zh-CN": "返回首页", en: "Back to Home" },
  "notFound.lines": { "zh-CN": "六条主线", en: "Strategic Lines" },
  "notFound.timeline": { "zh-CN": "证据时间轴", en: "Evidence Timeline" },

  // ─── Evidence labels ───────────────────────────────────────
  "evidence.primaryMulti": { "zh-CN": "官方来源 · 多源核验", en: "Official · Cross-checked" },
  "evidence.multiSecondary": { "zh-CN": "多方报道", en: "Multiple reports" },
  "evidence.singlePrimary": { "zh-CN": "官方来源", en: "Official source" },
  "evidence.secondary": { "zh-CN": "公开报道", en: "Public report" },
  "evidence.pending": { "zh-CN": "待核验", en: "Pending verification" },

  // ─── Evidence roles ────────────────────────────────────────
  "role.primary": { "zh-CN": "官方资料", en: "Official" },
  "role.secondary": { "zh-CN": "转载报道", en: "Secondary" },
  "role.amplification": { "zh-CN": "传播", en: "Amplification" },

  // ─── Score bands ───────────────────────────────────────────
  "score.high": { "zh-CN": "较高", en: "High" },
  "score.midHigh": { "zh-CN": "中高", en: "Mid-High" },
  "score.medium": { "zh-CN": "中等", en: "Medium" },
  "score.low": { "zh-CN": "偏低", en: "Low" },

  // ─── Scout kinds ───────────────────────────────────────────
  "scoutKind.venture": { "zh-CN": "创业假设", en: "Venture Hypothesis" },
  "scoutKind.media": { "zh-CN": "内容假设", en: "Media Hypothesis" },
  "scoutKind.work": { "zh-CN": "工作假设", en: "Work Hypothesis" },
  "scoutKind.learning": { "zh-CN": "学习假设", en: "Learning Hypothesis" },
  "scoutKind.artifact": { "zh-CN": "产物假设", en: "Artifact Hypothesis" },
  "scoutKind.influence": { "zh-CN": "影响力假设", en: "Influence Hypothesis" },
  "scoutKind.cognitive": { "zh-CN": "判断假设", en: "Reasoning Hypothesis" },

  // ─── Category names ────────────────────────────────────────
  "category.model": { "zh-CN": "模型能力", en: "Model Capability" },
  "category.research": { "zh-CN": "研究进展", en: "Research Progress" },
  "category.product": { "zh-CN": "产品发布", en: "Product Launch" },
  "category.commercialization": { "zh-CN": "商业化", en: "Commercialization" },
  "category.investment": { "zh-CN": "资本动作", en: "Capital Move" },
  "category.policy": { "zh-CN": "政策监管", en: "Policy & Regulation" },
  "category.infrastructure": { "zh-CN": "算力基础设施", en: "Compute Infrastructure" },
  "category.talent": { "zh-CN": "组织人才", en: "Talent & Organization" },
  "category.general": { "zh-CN": "行业事件", en: "Industry Event" },

  // ─── Tool tabs ─────────────────────────────────────────────
  "tab.scout": { "zh-CN": "行动参考", en: "Action Ideas" },
  "tab.actors": { "zh-CN": "关键角色", en: "Key Actors" },
  "tab.resources": { "zh-CN": "模型成本", en: "Model Costs" },
  "tab.product": { "zh-CN": "判断方法", en: "Method" },
  "tab.selectFilter": { "zh-CN": "选择筛选开始", en: "Select a filter to start" },

  // ─── Common / misc ─────────────────────────────────────────
  "common.openLine": { "zh-CN": "打开主线", en: "Open Line" },
  "common.unknown": { "zh-CN": "未知", en: "Unknown" },
  "common.pending": { "zh-CN": "待定", en: "Pending" },
  "common.noJudgment": {
    "zh-CN": "暂无经过审核的判断。",
    en: "No verified judgment available.",
  },
  "common.stars": { "zh-CN": "Star on GitHub", en: "Star on GitHub" },

  // ─── Date ──────────────────────────────────────────────────
  "date.unknown": { "zh-CN": "日期未知", en: "Unknown date" },
};

export function t(key: string, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return "";
  return entry[locale] ?? entry["zh-CN"] ?? "";
}
