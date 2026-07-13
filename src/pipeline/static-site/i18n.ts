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
  "nav.home": { "zh-CN": "今日必读", en: "Today's Brief" },
  "nav.lines": { "zh-CN": "趋势判断", en: "Industry Shifts" },
  "nav.timeline": { "zh-CN": "事件脉络", en: "Event Stories" },
  "nav.scout": { "zh-CN": "行动参考", en: "Action Ideas" },
  "nav.changelog": { "zh-CN": "Changelog", en: "Changelog" },
  "mobile.home": { "zh-CN": "今日", en: "Today" },
  "mobile.lines": { "zh-CN": "趋势", en: "Shifts" },
  "mobile.timeline": { "zh-CN": "脉络", en: "Stories" },
  "mobile.scout": { "zh-CN": "行动", en: "Actions" },
  "mobile.more": { "zh-CN": "来源", en: "Sources" },

  // ─── Brand ─────────────────────────────────────────────────
  "brand.subtitle": {
    "zh-CN": "每天 10 分钟 · 形成 AI 判断",
    en: "10 Minutes to Better AI Judgment",
  },
  "brand.aria": { "zh-CN": "Agent Pulse 首页", en: "Agent Pulse Home" },
  "brand.switchLang": { "zh-CN": "EN", en: "zh-CN" },

  // ─── Skip link & helpers ───────────────────────────────────
  "ui.skipMain": { "zh-CN": "跳到主要内容", en: "Skip to main content" },
  "ui.toggleTheme": { "zh-CN": "切换主题", en: "Toggle theme" },
  "ui.footerNav": { "zh-CN": "页脚导航", en: "Footer navigation" },
  "ui.desktopNav": { "zh-CN": "主导航", en: "Main navigation" },
  "ui.mobileNav": { "zh-CN": "移动导航", en: "Mobile navigation" },

  // ─── Footer ────────────────────────────────────────────────
  "footer.tagline": { "zh-CN": "Signal, not noise.", en: "Signal, not noise." },
  "footer.sources": { "zh-CN": "覆盖与来源", en: "Coverage & Sources" },
  "footer.legal": { "zh-CN": "版权与纠错", en: "Legal & Corrections" },
  "footer.changelog": { "zh-CN": "Changelog", en: "Changelog" },
  "footer.generatedAt": {
    "zh-CN": "一手来源优先 · 事实与判断分离 · 证据可追溯<br>静态快照 {date}",
    en: "Primary sources first · Facts separated from analysis · Evidence traceable<br>Static snapshot {date}",
  },

  // ─── Language switcher ─────────────────────────────────────
  "lang.label": { "zh-CN": "语言", en: "Language" },

  // ─── Home ──────────────────────────────────────────────────
  "home.brief": { "zh-CN": "30-SECOND BRIEF", en: "30-SECOND BRIEF" },
  "home.briefTitle": { "zh-CN": "今天最值得关注的变化", en: "The Shift That Matters Most Today" },
  "home.briefDesc": {
    "zh-CN": "先看清发生了什么，再理解它改变了什么、影响谁，以及下一步该观察什么。",
    en: "See what happened, what changed, who it affects, and what deserves watching next.",
  },
  "home.today": { "zh-CN": "TODAY", en: "TODAY" },
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
    "zh-CN": "今天暂无达到公开门槛的一手事件。",
    en: "No primary events meet the publication threshold today.",
  },
  "home.emptyDesc": {
    "zh-CN": "系统不会用低质量内容填满首屏。",
    en: "The system won't fill the front page with low-quality content.",
  },
  "home.publicBuild": { "zh-CN": "公开构建", en: "Public Build" },
  "home.promiseKicker": { "zh-CN": "AI INDUSTRY BRIEFING", en: "AI INDUSTRY BRIEFING" },
  "home.promiseTitle": {
    "zh-CN": "每天 10 分钟，看懂 AI 行业变化并形成判断",
    en: "Understand the AI Industry and Form a View in 10 Minutes a Day",
  },
  "home.promiseDesc": {
    "zh-CN": "不是追完所有新闻，而是找到真正改变技术、商业和竞争格局的事实，理解它为什么重要。",
    en: "Not every headline. Only the facts that change technology, business, and competition — with an explanation of why they matter.",
  },
  "home.journey30Title": { "zh-CN": "30 秒", en: "30 sec" },
  "home.journey30Desc": { "zh-CN": "知道最重要的变化", en: "Know the most important shift" },
  "home.journey3Title": { "zh-CN": "3 分钟", en: "3 min" },
  "home.journey3Desc": { "zh-CN": "理解影响与原因", en: "Understand impact and causes" },
  "home.journey10Title": { "zh-CN": "10 分钟", en: "10 min" },
  "home.journey10Desc": { "zh-CN": "形成自己的判断", en: "Form your own view" },

  // Home — Strategic lines section
  "home.sectionLines": { "zh-CN": "04 / INDUSTRY SHIFTS", en: "04 / INDUSTRY SHIFTS" },
  "home.sectionLinesTitle": { "zh-CN": "行业正在向哪里变化", en: "Where the Industry Is Moving" },
  "home.sectionLinesDesc": {
    "zh-CN": "把零散事件放回长期趋势，看到当前判断、最近转折与下一验证信号。",
    en: "Put individual events back into long-term shifts: current thesis, recent inflection, and next validation signal.",
  },

  // Home — Recent evidence section
  "home.sectionEvidence": { "zh-CN": "02 / ALSO WORTH KNOWING", en: "02 / ALSO WORTH KNOWING" },
  "home.sectionEvidenceTitle": { "zh-CN": "今天还需要知道", en: "Also Worth Knowing Today" },
  "home.sectionEvidenceDesc": {
    "zh-CN": "用几分钟扫完其他高价值变化；每条都能继续追到完整事件和原始来源。",
    en: "Scan the other high-value shifts in minutes, then follow each one to the full event and original sources.",
  },
  "home.openTimeline": { "zh-CN": "查看所有事件的发展脉络", en: "Explore Every Event Story" },

  // Home — Research section
  "home.sectionResearch": { "zh-CN": "03 / RESEARCH FRONTIER", en: "03 / RESEARCH FRONTIER" },
  "home.sectionResearchTitle": {
    "zh-CN": "本周值得读的技术论文",
    en: "Technical Papers Worth Reading",
  },
  "home.sectionResearchDesc": {
    "zh-CN":
      "不堆论文标题；只保留会改变评测、架构或决策方法的研究，并明确方法、影响与尚待验证之处。",
    en: "No paper dump. Only research that changes evaluation, architecture, or decisions — with method, impact, and open questions made explicit.",
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
    "zh-CN": "从理解变化，到形成判断",
    en: "Move from Understanding to Judgment",
  },
  "home.sectionToolsDesc": {
    "zh-CN": "沿事件看过程、沿来源核验盲区，再把判断转成一个可验证的下一步。",
    en: "Follow the event, inspect coverage gaps, then turn your view into one testable next step.",
  },

  // Home — Product section
  "home.sectionProduct": { "zh-CN": "06 / PRODUCT EVOLUTION", en: "06 / PRODUCT EVOLUTION" },
  "home.sectionProductTitle": { "zh-CN": "最近发生了哪些变化", en: "What's Changed Recently" },
  "home.sectionProductDesc": {
    "zh-CN": "Changelog 只提炼用户能感知的能力增量，不做新闻 ticker。",
    en: "Changelog captures capability increments users can feel — not a news ticker.",
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
  "home.githubTitle": { "zh-CN": "让证据链继续生长", en: "Let the Evidence Chain Keep Growing" },
  "home.githubDesc": {
    "zh-CN": "查看实现、提出来源、纠正事实，或用一个 Star 让更多人发现这个项目。",
    en: "View the implementation, suggest sources, correct facts, or help others discover this project with a Star.",
  },
  "home.starOnGitHub": { "zh-CN": "Star on GitHub", en: "Star on GitHub" },

  // Home — Manifesto
  "home.manifestoTitle": {
    "zh-CN": "别追每条新闻。<em>看清变化的方向。</em>",
    en: "Don't chase every headline.<em> See where things are headed.</em>",
  },
  "home.manifestoDesc": {
    "zh-CN":
      "从一手事实出发，沿技术、AGI、商业、资本与中国追赶主线，找到真正会改变决策的行业转折。",
    en: "Start with primary facts. Follow the technology, AGI, business, capital, and China catch-up lines to find the inflections that change decisions.",
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
    "zh-CN": "理解关键公司与人物正在推动什么，以及判断依据是否充分。",
    en: "Understand what key companies and people are driving — and whether the evidence is strong enough.",
  },
  "home.gatewayResources": { "zh-CN": "核对选型与真实成本", en: "Check Options and Real Costs" },
  "home.gatewayResourcesStat": {
    "zh-CN": "{count} 个购买入口",
    en: "{count} purchase options",
  },
  "home.gatewayResourcesDesc": {
    "zh-CN": "价格、单位、核验时间与风险同屏。",
    en: "Price, unit, verification date, and risk — all on one screen.",
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
    "zh-CN": "从零散事件，看见行业方向",
    en: "See Industry Direction Beyond Individual Events",
  },
  "lines.heroDesc": {
    "zh-CN": "每个趋势都回答三个问题：现在走到哪一步、最近什么发生了改变、什么信号会推翻当前判断。",
    en: "Each shift answers three questions: where we are, what recently changed, and what could overturn the current view.",
  },
  "lines.statusEvents": { "zh-CN": "{count} 个公开事件", en: "{count} public events" },
  "lines.selectLine": { "zh-CN": "选择一条主线开始", en: "Pick a line to start" },
  "lines.howTitle": {
    "zh-CN": "同一事实，沿不同视角理解",
    en: "Same Facts, Different Lenses",
  },
  "lines.howDesc": {
    "zh-CN": "技术变化会传导到产品、商业、资本与中国相对位置。",
    en: "Technology changes cascade into products, business models, capital flows, and China's relative position.",
  },
  "lines.flowTech": { "zh-CN": "技术能力", en: "Technology" },
  "lines.flowProduct": { "zh-CN": "产品阈值", en: "Product Threshold" },
  "lines.flowBusiness": { "zh-CN": "商业验证", en: "Business Validation" },
  "lines.flowCapital": { "zh-CN": "资本与竞争", en: "Capital & Competition" },

  // Lines — detail
  "lines.phases": { "zh-CN": "01 / PHASES", en: "01 / PHASES" },
  "lines.phasesTitle": { "zh-CN": "阶段轨迹", en: "Phase Trajectory" },
  "lines.phasesDesc": {
    "zh-CN": "阶段摘要属于分析；具体事实以事件证据为准。",
    en: "Phase summaries are analytical; specific facts are based on event evidence.",
  },
  "lines.evidenceSpine": { "zh-CN": "02 / EVIDENCE SPINE", en: "02 / EVIDENCE SPINE" },
  "lines.evidenceSpineTitle": { "zh-CN": "证据如何累积", en: "How Evidence Accumulates" },
  "lines.evidenceSpineDesc": {
    "zh-CN": "{count} 个公开节点，优先展示一手事实。",
    en: "{count} public nodes, prioritized by primary sources.",
  },
  "lines.lenses": { "zh-CN": "03 / DECISION LENSES", en: "03 / DECISION LENSES" },
  "lines.lensesTitle": { "zh-CN": "四种角色，四个问题", en: "Four Roles, Four Questions" },
  "lines.lensesDesc": {
    "zh-CN": "以下判断来自本主线公开事件，不替代独立决策。",
    en: "These judgments come from public events on this line — not a substitute for independent decisions.",
  },
  "lines.chinaSection": { "zh-CN": "CHINA / GLOBAL", en: "CHINA / GLOBAL" },
  "lines.chinaTitle": { "zh-CN": "中国进展与全球坐标", en: "China's Progress in Global Context" },
  "lines.evidenceGap": { "zh-CN": "EVIDENCE GAP", en: "EVIDENCE GAP" },
  "lines.evidenceGapTitle": {
    "zh-CN": "系统还不知道什么",
    en: "What the System Doesn't Know Yet",
  },
  "lines.evidenceGapDesc": {
    "zh-CN": "缺口不会被空泛判断填满；新结论需要一手来源或相互独立的二手佐证。",
    en: "Gaps won't be filled with vague assertions. New conclusions require primary sources or mutually independent secondary corroboration.",
  },
  "lines.dense": {
    "zh-CN": "公开节点已形成连续骨架，但多源交叉验证仍需继续补强。",
    en: "Public nodes form a continuous skeleton, but multi-source cross-validation still needs strengthening.",
  },
  "lines.sparse": {
    "zh-CN": "当前只有 {count} 个公开节点，仍属于证据稀疏主线。",
    en: "Currently only {count} public nodes — still an evidence-sparse line.",
  },
  "lines.waitingNext": {
    "zh-CN": "等待能改变当前判断的一手证据。",
    en: "Awaiting primary evidence that could change the current thesis.",
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
  "lines.noEvidence": { "zh-CN": "暂无一手证据节点。", en: "No primary evidence nodes yet." },
  "lines.viewTimeline": {
    "zh-CN": "在时间轴查看全部节点",
    en: "View all nodes on the timeline",
  },
  "lines.openLine": { "zh-CN": "打开主线", en: "Open Line" },
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
  "lines.navAria": { "zh-CN": "六条主线", en: "Strategic lines" },

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
    "zh-CN": "一个事件，一条完整脉络",
    en: "One Event, One Complete Story",
  },
  "timeline.heroDesc": {
    "zh-CN": "把首次出现、官方更新、外部讨论和行业反馈聚合在一起，默认先看最近有新进展的事件。",
    en: "First reports, official updates, external discussion, and industry response stay together. Events with the latest development come first.",
  },
  "timeline.statusEvents": { "zh-CN": "{count} 个公开事件", en: "{count} public events" },
  "timeline.statusPrimary": {
    "zh-CN": "{count} 个含一手证据",
    en: "{count} with primary evidence",
  },
  "timeline.statusHint": { "zh-CN": "搜索或选择主线", en: "Search or select a line" },
  "timeline.searchPlaceholder": {
    "zh-CN": "搜索主体、技术、事件或关键词",
    en: "Search company, topic, event, or keyword",
  },
  "timeline.filterAll": { "zh-CN": "全部", en: "All" },
  "timeline.filterPrimary": { "zh-CN": "一手证据", en: "Primary" },
  "timeline.filterResearch": { "zh-CN": "论文与研究", en: "Papers & Research" },
  "timeline.nodes": { "zh-CN": "{count} 个事件", en: "{count} events" },
  "timeline.monthEvents": { "zh-CN": "{count} 个事件", en: "{count} events" },
  "timeline.drawerLabel": { "zh-CN": "事件详情抽屉", en: "Event detail drawer" },
  "timeline.drawerKicker": { "zh-CN": "事件判断", en: "EVENT ASSESSMENT" },
  "timeline.closePreview": { "zh-CN": "关闭预览", en: "Close preview" },
  "timeline.pendingTrack": { "zh-CN": "待编排", en: "Unassigned" },
  "timeline.searchLabel": { "zh-CN": "时间轴筛选", en: "Timeline filter" },
  "timeline.developments": { "zh-CN": "{count} 次进展", en: "{count} developments" },
  "timeline.latestUpdate": { "zh-CN": "最近进展 {date}", en: "Latest update {date}" },
  "timeline.scoresDisclaimer": {
    "zh-CN": "用于排序，不代表客观真值。",
    en: "For ranking only, not objective truth.",
  },
  "timeline.noActors": { "zh-CN": "暂无角色关联", en: "No related actors" },
  "timeline.researchDigest": { "zh-CN": "论文日报", en: "Research Daily" },
  "timeline.researchDigestCount": {
    "zh-CN": "当天收录 {count} 篇研究",
    en: "{count} papers tracked that day",
  },
  "timeline.researchDigestFallback": {
    "zh-CN": "展开查看全部研究事件",
    en: "Expand to view every research event",
  },
  "timeline.expandResearch": { "zh-CN": "展开全部论文", en: "Expand all papers" },

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
    "zh-CN": "用于排序，不代表客观真值。",
    en: "For ranking only, not objective truth.",
  },
  "event.evidence": { "zh-CN": "原始证据", en: "Source Evidence" },
  "event.relatedActors": { "zh-CN": "相关角色", en: "Related Actors" },
  "event.noActors": { "zh-CN": "暂无角色关联", en: "No related actors" },
  "event.openEvent": { "zh-CN": "打开完整事件", en: "Open Full Event" },
  "event.sourceEvidence": { "zh-CN": "原始证据", en: "Source Evidence" },
  "event.relatedSection": { "zh-CN": "继续沿主线阅读", en: "Continue Reading Along the Line" },
  "event.relatedDesc": {
    "zh-CN": "相邻事件共享主线，但事实和证据保持独立。",
    en: "Adjacent events share the line, but facts and evidence remain independent.",
  },
  "event.noRelated": { "zh-CN": "暂无相关公开事件。", en: "No related public events." },
  "event.evidenceCount": { "zh-CN": "{count} 条证据", en: "{count} pieces of evidence" },
  "event.developmentTitle": { "zh-CN": "事情是如何发展到今天的", en: "How This Developed" },
  "event.developmentDesc": {
    "zh-CN": "同一事件的事实更新按时间聚合；最后的当前判断属于 Agent Pulse 分析。",
    en: "Updates to the same event are grouped chronologically. The current assessment is Agent Pulse analysis.",
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
  "scout.heroTitle": { "zh-CN": "星探机会", en: "Scout Opportunities" },
  "scout.heroDesc": {
    "zh-CN": "把行业变化转成可以在 7–30 天验证的创业、内容与工作实验。",
    en: "Turn industry changes into venture, content, and work experiments you can validate in 7–30 days.",
  },
  "scout.statusHypotheses": { "zh-CN": "{count} 条公开假设", en: "{count} public hypotheses" },
  "scout.statusDisclaimer": { "zh-CN": "假设，不是事实", en: "Hypotheses, not facts" },
  "scout.filterAll": { "zh-CN": "全部", en: "All" },
  "scout.filterVenture": { "zh-CN": "创业", en: "Venture" },
  "scout.filterMedia": { "zh-CN": "内容", en: "Media" },
  "scout.filterWork": { "zh-CN": "工作", en: "Work" },
  "scout.empty": {
    "zh-CN": "暂无达到公开门槛的机会假设。",
    en: "No opportunity hypotheses meet the publication threshold yet.",
  },

  // ─── Actors ────────────────────────────────────────────────
  "actors.heroTitle": { "zh-CN": "AI 角色雷达", en: "AI Actor Radar" },
  "actors.heroDesc": {
    "zh-CN": "角色已收录不等于已被持续观测；所有位置判断都应回到事件证据。",
    en: "A cataloged actor isn't necessarily under active observation — all position judgments should trace back to event evidence.",
  },
  "actors.statusActors": { "zh-CN": "{count} 个角色", en: "{count} actors" },
  "actors.statusChina": { "zh-CN": "{count} 个中国角色", en: "{count} China-based actors" },
  "actors.filterAll": { "zh-CN": "全部", en: "All" },
  "actors.filterChina": { "zh-CN": "中国", en: "China" },
  "actors.filterGlobal": { "zh-CN": "全球", en: "Global" },
  "actors.filterUS": { "zh-CN": "美国", en: "US" },
  "actors.observationNote": {
    "zh-CN": "已收录角色 · 持续观测程度需回到事件证据",
    en: "Cataloged actor — verification of active observation requires returning to event evidence",
  },
  "actors.domainUnknown": { "zh-CN": "领域待补", en: "Domain TBD" },
  "actors.website": { "zh-CN": "官方网站", en: "Official Website" },

  // ─── Resources ─────────────────────────────────────────────
  "resources.heroTitle": { "zh-CN": "模型与 API 获取", en: "Models & API Access" },
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
  "product.heroTitle": { "zh-CN": "系统能力与水位", en: "System Capabilities & Depth" },
  "product.heroDesc": {
    "zh-CN": "不只展示总分，也展示样本不足、硬上限、惩罚和下一步。",
    en: "Not just the overall score — also sample gaps, hard caps, penalties, and next steps.",
  },
  "product.statusScore": { "zh-CN": "{score}/100 校准分", en: "{score}/100 Calibrated" },
  "product.statusPending": { "zh-CN": "评测待生成", en: "Evaluation Pending" },
  "product.statusCapabilities": { "zh-CN": "{count} 项能力", en: "{count} capabilities" },
  "product.metricVersion": { "zh-CN": "版本", en: "Version" },
  "product.metricSources": { "zh-CN": "来源目录", en: "Source Catalog" },
  "product.metricObserving": { "zh-CN": "E3 观察", en: "E3 Observing" },
  "product.metricCoverage": { "zh-CN": "证据覆盖", en: "Evidence Coverage" },
  "product.evalTitle": {
    "zh-CN": "评测不是漂亮数字",
    en: "Evaluation Is Not Just a Number",
  },
  "product.evalDesc": {
    "zh-CN": "raw、校准分、样本和惩罚同时公开。",
    en: "Raw scores, calibrated scores, sample sizes, and penalties — all public.",
  },
  "product.capabilityTitle": { "zh-CN": "能力图谱", en: "Capability Map" },
  "product.capabilityDesc": {
    "zh-CN": "operational、experimental 与 planned 明确分层。",
    en: "Operational, experimental, and planned — clearly tiered.",
  },
  "product.roadmapTitle": { "zh-CN": "未来如何生长", en: "How It Will Grow" },
  "product.roadmapDesc": {
    "zh-CN": "每个 State 都有明确承诺和里程碑。",
    en: "Each State has clear commitments and milestones.",
  },
  "product.evalEmpty": { "zh-CN": "暂无评测结果。", en: "No evaluation results yet." },
  "product.nextAction": { "zh-CN": "下一步", en: "Next Step" },
  "product.hardCap": { "zh-CN": "硬上限", en: "Hard Cap" },
  "product.sample": { "zh-CN": "样本", en: "Sample" },

  // ─── Changelog ─────────────────────────────────────────────
  "changelog.heroTitle": { "zh-CN": "Changelog", en: "Changelog" },
  "changelog.heroDesc": {
    "zh-CN": "每个版本都回答：用户获得了什么、能力如何增长、哪些指标发生变化。",
    en: "Every release answers: what users gained, how capabilities grew, and which metrics changed.",
  },
  "changelog.status": { "zh-CN": "{count} 条版本记录", en: "{count} release entries" },
  "changelog.current": { "zh-CN": "当前 v{version}", en: "Current v{version}" },
  "changelog.nav": { "zh-CN": "沿版本轨道回看", en: "Trace the release track" },
  "changelog.latest": { "zh-CN": "LATEST RELEASE", en: "LATEST RELEASE" },
  "changelog.inDevelopment": { "zh-CN": "开发中", en: "IN DEVELOPMENT" },
  "changelog.next": { "zh-CN": "NEXT", en: "NEXT" },
  "changelog.release": { "zh-CN": "RELEASE", en: "RELEASE" },
  "changelog.capabilities": { "zh-CN": "能力增量", en: "Capability Increments" },
  "changelog.changes": { "zh-CN": "用户可感知变化", en: "User-Visible Changes" },

  // ─── Sources ───────────────────────────────────────────────
  "sources.heroTitle": {
    "zh-CN": "哪些领域真的被持续看见",
    en: "Which Areas Are Actually Being Tracked",
  },
  "sources.heroDesc": {
    "zh-CN": "先看具体技术领域的覆盖强弱，再核对每个来源的真实运行状态。收录不等于有效观测。",
    en: "Start with coverage strength by technology, then inspect each source's real runtime status. Cataloged does not mean effectively monitored.",
  },
  "sources.coverageKicker": { "zh-CN": "TECH COVERAGE CHECK", en: "TECH COVERAGE CHECK" },
  "sources.coverageTitle": {
    "zh-CN": "我们持续看到了什么，又漏掉了什么",
    en: "What We Track — and What We Still Miss",
  },
  "sources.coverageDesc": {
    "zh-CN": "目录有来源不等于持续有效覆盖。下面同时展示最近健康状态、渠道宽度和待补强方向。",
    en: "A catalog entry is not the same as effective coverage. See recent health, channel breadth, and what still needs strengthening.",
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
    "zh-CN": "查看全部来源与运行状态",
    en: "Explore Every Source and Its Runtime Status",
  },
  "sources.catalogDesc": {
    "zh-CN": "按名称、领域或地域搜索。健康状态来自最近一次真实检查，不以目录配置代替。",
    en: "Search by name, domain, or region. Health comes from the latest real check, never from catalog configuration alone.",
  },
  "sources.statusTotal": { "zh-CN": "{total} 个目录源", en: "{total} catalog sources" },
  "sources.statusObserving": { "zh-CN": "{total} 个 E3 观察", en: "{total} E3 observing" },
  "sources.statusActive": { "zh-CN": "{total} 个 E4 active", en: "{total} E4 active" },
  "sources.levelE0Desc": { "zh-CN": "有身份与端点", en: "Identified with endpoint" },
  "sources.levelE1Desc": { "zh-CN": "当前可访问", en: "Currently accessible" },
  "sources.levelE2Desc": {
    "zh-CN": "合法内容与质量门槛",
    en: "Valid content meets quality threshold",
  },
  "sources.levelE3Desc": {
    "zh-CN": "隔离采集，不进公开事实",
    en: "Isolated collection, not yet in public facts",
  },
  "sources.levelE4Desc": {
    "zh-CN": "长期验证 + 自动契约",
    en: "Long-term validation + automated contracts",
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
    "zh-CN": "发现值得长期观测的来源？",
    en: "Found a source worth long-term observation?",
  },
  "sources.contributeDesc": {
    "zh-CN":
      "Proposal 会经过 URL 安全、重复、许可、fixture、shadow 与自动晋级门禁；Issue 不会直接激活来源。",
    en: "Proposals go through URL safety, dedup, licensing, fixtures, shadow observation, and automated promotion gates. Issues never activate sources directly.",
  },
  "sources.contributeButton": { "zh-CN": "提出来源建议", en: "Suggest a Source" },
  "sources.ariaOpen": { "zh-CN": "打开 {name}", en: "Open {name}" },

  // ─── Legal ─────────────────────────────────────────────────
  "legal.heroTitle": {
    "zh-CN": "尊重来源，也保护判断的可验证性",
    en: "Respect Sources, Protect Verifiability",
  },
  "legal.heroDesc": {
    "zh-CN": "Agent Pulse 发布必要 metadata、有限短摘录和原创分析，不镜像第三方正文。",
    en: "Agent Pulse publishes necessary metadata, limited short excerpts, and original analysis. It does not mirror third-party content.",
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
  "legal.scopeTitle": { "zh-CN": "代码与内容许可分开", en: "Code vs Content Licenses" },
  "legal.scopeDesc": {
    "zh-CN":
      "仓库中的源代码和明确标记的项目自有文档适用仓库 LICENSE。第三方标题、论文、新闻、博客、Release、商标、Logo 与其他材料的权利归各自权利人；MIT 不授予第三方内容使用权。",
    en: "Source code and clearly marked project documentation are covered by the repo LICENSE. Third-party titles, papers, news, blogs, releases, trademarks, logos, and other materials retain their respective owners' rights. MIT does not grant usage rights to third-party content.",
  },
  "legal.sourcesTitle": {
    "zh-CN": "只保留理解所需的最小内容",
    en: "Minimum Content for Understanding",
  },
  "legal.sourcesDesc": {
    "zh-CN":
      "公开事件使用原创事实摘要与分析，并回链 canonical source。来源全文、付费内容、登录后内容、cookie、原始 payload 和内部样本不会进入 Pages。",
    en: "Public events use original fact summaries and analysis with links back to canonical sources. Full source text, paywalled content, authenticated content, cookies, raw payloads, and internal samples never enter Pages.",
  },
  "legal.correctionTitle": {
    "zh-CN": "纠错、署名与下架",
    en: "Corrections, Attribution & Takedown",
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
    "zh-CN": "不是投资、采购或法律建议",
    en: "Not Investment, Procurement, or Legal Advice",
  },
  "legal.disclaimerDesc": {
    "zh-CN":
      "评分是系统估计，预测和机会是假设。模型价格、来源状态与行业判断只代表标注时点，使用者应核验原始证据并独立决策。",
    en: "Scores are system estimates. Forecasts and opportunities are hypotheses. Model prices, source status, and industry judgments reflect the noted date. Users should verify original evidence and decide independently.",
  },
  "legal.iconsTitle": {
    "zh-CN": "本地图标与第三方资产",
    en: "Local Icons & Third-Party Assets",
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
    "zh-CN": "这条信号不在公开时间轴",
    en: "This Signal Isn't on the Public Timeline",
  },
  "notFound.body": {
    "zh-CN": "页面可能已经移动、合并或撤回。你可以回到今日判断，或沿主线继续阅读。",
    en: "The page may have been moved, merged, or removed. Return to today's signal or continue reading along a strategic line.",
  },
  "notFound.home": { "zh-CN": "返回首页", en: "Back to Home" },
  "notFound.lines": { "zh-CN": "六条主线", en: "Strategic Lines" },
  "notFound.timeline": { "zh-CN": "证据时间轴", en: "Evidence Timeline" },

  // ─── Evidence labels ───────────────────────────────────────
  "evidence.primaryMulti": { "zh-CN": "一手 + 多源佐证", en: "Primary + Multi-source" },
  "evidence.multiSecondary": { "zh-CN": "多源二手待确认", en: "Multi-source Secondary" },
  "evidence.singlePrimary": { "zh-CN": "单一一手来源", en: "Single Primary Source" },
  "evidence.secondary": { "zh-CN": "二手证据待补强", en: "Secondary Evidence" },
  "evidence.pending": { "zh-CN": "证据待补", en: "Evidence Pending" },

  // ─── Evidence roles ────────────────────────────────────────
  "role.primary": { "zh-CN": "一手", en: "Primary" },
  "role.secondary": { "zh-CN": "二手", en: "Secondary" },
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
  "scoutKind.cognitive": { "zh-CN": "认知假设", en: "Cognitive Hypothesis" },

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
  "tab.actors": { "zh-CN": "关键参与者", en: "Key Players" },
  "tab.resources": { "zh-CN": "选型与成本", en: "Options & Costs" },
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
  if (!entry) return key;
  return entry[locale] ?? entry["zh-CN"] ?? key;
}
