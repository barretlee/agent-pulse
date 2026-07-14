import type { CuratedEventSeed } from "./history.js";

const event = (value: CuratedEventSeed): CuratedEventSeed => value;

/**
 * First-party capital and company milestones that explain how frontier AI became
 * coupled to cloud distribution, compute commitments and corporate consolidation.
 */
export const capitalHistoryEvents = [
  event({
    slug: "microsoft-openai-multibillion-partnership",
    title: "Microsoft 扩大对 OpenAI 的多年投资：模型、算力与云分发形成深度绑定",
    fact: "Microsoft 于 2023 年 1 月宣布与 OpenAI 进入第三阶段合作，并进行一笔多年、数十亿美元规模的投资。",
    summary: "前沿模型融资不再只是股权交易，而是同时绑定超级计算建设、Azure 独家云服务和产品分发。",
    technical:
      "资本直接转化为训练集群、云容量和模型部署基础设施，使算力供给成为模型迭代速度的一部分。",
    industry: "模型公司与超大规模云厂商形成联盟，资本、计算资源和企业渠道开始由同一合作关系提供。",
    future: "观察独家云关系、知识产权许可、收入分成和新增算力承诺如何随双方规模变化。",
    business:
      "投资人评估模型公司时需要把融资额与云承诺、分发权和商业条款一起建模，而不是只看估值。",
    category: "strategic-investment",
    company: "Microsoft / OpenAI",
    keywords: ["Microsoft", "OpenAI", "战略投资", "Azure", "云绑定"],
    scores: [99, 0, 98, 98],
    date: "2023-01-23T00:00:00.000Z",
    source: "microsoft-ai",
    url: "https://blogs.microsoft.com/blog/2023/01/23/microsoftandopenaiextendpartnership/",
    tracks: ["investing", "commercialization", "model-economics", "to-b"],
    actors: ["microsoft", "openai"],
  }),
  event({
    slug: "anthropic-series-c-450m",
    title: "Anthropic 完成 4.5 亿美元 Series C：安全路线进入产品与企业扩张期",
    fact: "Anthropic 于 2023 年 5 月宣布完成 4.5 亿美元 Series C，由 Spark Capital 领投，Google、Salesforce Ventures、Zoom Ventures 等参与。",
    summary:
      "前沿模型资本开始同时押注能力、安全研究和企业产品，Claude 的长上下文与 API 扩张获得持续投入。",
    technical:
      "资金被用于扩大产品、企业部署和对齐研究，说明安全能力与计算密集型模型开发需要共同扩张。",
    industry: "多家产业投资者进入同一轮融资，验证前沿模型正成为云、软件和协作平台的共同基础设施。",
    future: "观察新增资本能否转化为模型领先、企业收入、计算供给和可验证的安全能力。",
    business:
      "判断基础模型融资质量时，应同时核对产品采用、算力需求和治理结构，避免把大额融资等同商业成熟。",
    category: "funding",
    company: "Anthropic",
    keywords: ["Anthropic", "Series C", "融资", "Claude", "AI 安全"],
    scores: [99, 0, 93, 92],
    date: "2023-05-23T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/news/anthropic-series-c",
    tracks: ["investing", "commercialization", "agi-progress", "to-b"],
    actors: ["anthropic"],
  }),
  event({
    slug: "amazon-anthropic-4b-cloud-alliance",
    title: "Amazon 计划向 Anthropic 投资至多 40 亿美元：云、芯片与模型形成第二个前沿联盟",
    fact: "Anthropic 于 2023 年 9 月宣布 Amazon 将投资至多 40 亿美元并取得少数股权，AWS 成为其关键工作负载的主要云提供商。",
    summary:
      "Microsoft—OpenAI 之外出现第二个由资本、定制芯片、云分发和模型供给共同组成的前沿模型联盟。",
    technical:
      "Anthropic 计划使用 Trainium 与 Inferentia，并与 AWS 协作优化后续芯片，使模型训练需求进入芯片路线设计。",
    industry: "云厂商通过战略投资锁定模型供给，模型公司则用长期算力和企业渠道降低扩张约束。",
    future: "观察 Trainium 的实际训练占比、Bedrock 使用量和模型公司对单一云平台的依赖程度。",
    business:
      "企业采购 Claude 时需要同时考虑模型能力、AWS 绑定和迁移成本；投资判断也应计入云承诺的经济价值。",
    category: "strategic-investment",
    company: "Amazon / Anthropic",
    keywords: ["Amazon", "Anthropic", "AWS", "Trainium", "战略投资"],
    scores: [99, 0, 97, 97],
    date: "2023-09-25T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/news/anthropic-amazon",
    tracks: ["investing", "commercialization", "model-economics", "to-b"],
    actors: ["anthropic"],
  }),
  event({
    slug: "microsoft-g42-1-5b-investment",
    title: "Microsoft 投资 G42 15 亿美元：主权 AI 与云联盟扩展到中东市场",
    fact: "Microsoft 于 2024 年 4 月宣布向 G42 投资 15 亿美元取得少数股权，并与 G42 支持设立 10 亿美元开发者基金。",
    summary: "全球 AI 资本开始把云基础设施、主权数据要求、区域市场和人才生态打包为战略投资。",
    technical:
      "G42 的数据平台和关键工作负载将迁移到 Azure，合作同时受安全、合规和政府间保证协议约束。",
    industry: "前沿云平台通过本地伙伴进入受监管市场，区域 AI 公司则用资本与云能力扩大交付半径。",
    future: "观察主权云项目、区域模型采用、数据边界和开发者基金是否形成可持续需求。",
    business: "出海团队需要把本地资本、合规和云伙伴视为同一市场进入结构，不能只复制产品销售模式。",
    category: "strategic-investment",
    company: "Microsoft / G42",
    keywords: ["Microsoft", "G42", "战略投资", "主权 AI", "中东"],
    scores: [99, 0, 92, 91],
    date: "2024-04-15T00:00:00.000Z",
    source: "microsoft-ai",
    url: "https://blogs.microsoft.com/blog/2024/04/15/microsoft-and-g42-partner-to-accelerate-ai-innovation-in-uae-and-beyond/",
    tracks: ["investing", "global-innovation", "commercialization", "to-b", "to-g"],
    actors: ["microsoft"],
  }),
  event({
    slug: "xai-series-b-6b",
    title: "xAI 完成 60 亿美元 Series B：资本开始直接竞逐超大规模训练集群",
    fact: "xAI 于 2024 年 5 月宣布完成 60 亿美元 Series B，投资方包括 Valor、Vy Capital、a16z、Sequoia 与 Fidelity 等。",
    summary:
      "成立不足一年的模型公司以大额融资加速产品、基础设施和研发，训练集群规模成为资本竞争的直接目标。",
    technical:
      "融资用途明确覆盖先进基础设施与后续模型研发，意味着模型路线与 GPU 集群建设需要同步推进。",
    industry: "前沿模型市场的资本门槛继续上升，新进入者需要在短期内同时建立研究、算力和分发能力。",
    future: "观察融资转化为可用算力的速度、Grok 产品采用、模型迭代和单位能力成本。",
    business:
      "投资人应区分承诺建设的集群与已经稳定运行的有效算力，并追踪其对产品收入和模型能力的转化。",
    category: "funding",
    company: "xAI",
    keywords: ["xAI", "Series B", "融资", "Grok", "训练集群"],
    scores: [99, 0, 96, 95],
    date: "2024-05-26T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/series-b",
    tracks: ["investing", "agi-progress", "model-economics", "to-c"],
    actors: [],
  }),
  event({
    slug: "openai-6-6b-funding-157b-valuation",
    title: "OpenAI 融资 66 亿美元：前沿模型公司估值进入平台级规模",
    fact: "OpenAI 于 2024 年 10 月宣布融资 66 亿美元，投后估值为 1570 亿美元。",
    summary: "用户规模、企业采用和训练算力需求共同把前沿模型公司推向大型平台公司的资本密度。",
    technical:
      "公告将资金用途指向前沿研究与计算能力扩张，说明新增模型能力仍高度依赖持续基础设施投入。",
    industry:
      "资本进一步集中到少数具备模型、产品入口和全球分发的公司，中小模型厂商面临更强规模压力。",
    future: "观察新增算力、收入增长、治理变化和高估值下的长期毛利能否同步兑现。",
    business: "评估此类融资不能只看估值，应拆分消费入口、API 收入、企业采用和计算承诺的真实质量。",
    category: "funding",
    company: "OpenAI",
    keywords: ["OpenAI", "融资", "估值", "算力", "平台化"],
    scores: [99, 0, 98, 98],
    date: "2024-10-02T00:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/scale-the-benefits-of-ai/",
    tracks: ["investing", "commercialization", "model-economics", "to-c", "to-b"],
    actors: ["openai"],
  }),
  event({
    slug: "amazon-anthropic-total-8b-trainium",
    title: "Amazon 对 Anthropic 总投资增至 80 亿美元：模型与自研芯片绑定继续加深",
    fact: "Anthropic 于 2024 年 11 月宣布 Amazon 新增 40 亿美元投资，使总投资达到 80 亿美元，并确立 AWS 为主要云和训练伙伴。",
    summary:
      "战略投资从获取模型供给进一步进入芯片软硬件协同，Trainium 的采用开始影响双方资本回报。",
    technical:
      "Anthropic 与 Annapurna Labs 协作优化 Trainium 内核和 Neuron 软件栈，把真实模型负载反馈到芯片设计。",
    industry:
      "云厂商投资模型公司的价值越来越取决于自研芯片利用率、云收入和企业模型分发，而非单纯股权升值。",
    future: "观察 Trainium 训练规模、Bedrock Claude 用量和 AWS 自研芯片相对 GPU 的成本效率。",
    business:
      "基础设施投资判断应追踪芯片、云和模型三层的相互拉动，避免把承诺金额重复计算为多个独立增长来源。",
    category: "strategic-investment",
    company: "Amazon / Anthropic",
    keywords: ["Amazon", "Anthropic", "AWS", "Trainium", "80 亿美元"],
    scores: [99, 0, 97, 96],
    date: "2024-11-22T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/news/anthropic-amazon-trainium",
    tracks: ["investing", "model-economics", "commercialization", "to-b"],
    actors: ["anthropic"],
  }),
  event({
    slug: "anthropic-series-e-3-5b-61-5b",
    title: "Anthropic 完成 35 亿美元 Series E：编码与企业采用支撑新一轮扩张",
    fact: "Anthropic 于 2025 年 3 月宣布完成 35 亿美元融资，投后估值 615 亿美元，由 Lightspeed Venture Partners 领投。",
    summary: "资本继续集中到已经形成模型差异化、开发者产品和企业分发的前沿实验室。",
    technical:
      "资金将用于下一代系统、计算容量、可解释性与对齐研究及国际扩张，研发和商业化仍同步消耗资本。",
    industry:
      "Claude Code 与企业采用被纳入融资叙事，资本判断开始从模型榜单转向可持续的高价值工作流。",
    future: "观察编码产品收入、企业续费、国际扩张和计算投入之间的规模效率。",
    business:
      "投资负责人应把模型公司的产品收入与计算成本配对分析，确认增长是否改善单位任务经济性。",
    category: "funding",
    company: "Anthropic",
    keywords: ["Anthropic", "Series E", "融资", "Claude Code", "估值"],
    scores: [99, 0, 95, 95],
    date: "2025-03-03T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/news/anthropic-raises-series-e-at-usd61-5b-post-money-valuation",
    tracks: ["investing", "commercialization", "to-b", "to-d"],
    actors: ["anthropic"],
  }),
  event({
    slug: "openai-40b-funding-300b-valuation",
    title: "OpenAI 融资 400 亿美元：前沿模型资本需求跃迁到基础设施级别",
    fact: "OpenAI 于 2025 年 3 月宣布获得 400 亿美元新资金，投后估值 3000 亿美元，并与 SoftBank Group 合作。",
    summary:
      "单轮融资规模进入大型基础设施项目量级，模型研究、计算扩张和全球产品分发被放入同一资本计划。",
    technical:
      "公告明确把资金用于前沿研究、计算基础设施和面向大规模用户交付，算力供给成为增长前提。",
    industry:
      "资本进一步向拥有全球消费入口和开发者平台的少数公司集中，前沿竞争的融资门槛急剧上升。",
    future: "观察资金分期、算力项目交付、用户增长、收入与治理结构变化是否匹配估值提升。",
    business:
      "投资判断需要把承诺资本、实际到账、基础设施支出和收入增长分开，避免用总融资额替代经营质量。",
    category: "funding",
    company: "OpenAI",
    keywords: ["OpenAI", "SoftBank", "融资", "3000 亿美元估值", "算力"],
    scores: [99, 0, 100, 99],
    date: "2025-03-31T00:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/march-funding-updates/",
    tracks: ["investing", "agi-progress", "model-economics", "commercialization"],
    actors: ["openai"],
  }),
  event({
    slug: "openai-io-device-team-merger",
    title: "io 团队并入 OpenAI：模型公司开始向原生 AI 设备与交互入口扩张",
    fact: "OpenAI 与 Jony Ive 于 2025 年 5 月公布合作，并在 7 月更新确认 io Products 团队已正式并入 OpenAI。",
    summary:
      "前沿模型公司通过团队整合进入硬件与交互设计，竞争边界从 API 和软件产品扩展到新设备入口。",
    technical:
      "原生 AI 设备需要把模型、传感器、低延迟推理、隐私和持续交互共同设计，单纯增加语音入口并不足够。",
    industry:
      "模型平台开始吸收产品设计与硬件能力，可能重构手机、可穿戴设备和个人 Agent 的分发关系。",
    future: "观察首款产品形态、端云分工、供应链、隐私边界和真实任务频次。",
    business: "硬件扩张增加了供应链与渠道风险，但也可能让模型公司拥有更稳定的用户入口和上下文。",
    category: "company-merger",
    company: "OpenAI / io",
    keywords: ["OpenAI", "io", "Jony Ive", "AI 硬件", "公司整合"],
    scores: [98, 0, 94, 93],
    date: "2025-05-21T00:00:00.000Z",
    source: "openai",
    url: "https://openai.com/sam-and-jony/",
    tracks: ["investing", "commercialization", "to-c"],
    actors: ["openai"],
  }),
] as const;
