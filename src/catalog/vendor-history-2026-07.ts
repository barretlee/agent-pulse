import type { CuratedEventSeed } from "./history.js";

const event = (value: CuratedEventSeed): CuratedEventSeed => value;

export const vendorHistoryEvents = [
  event({
    slug: "grok-1-open-weights",
    title: "Grok-1 开放权重：xAI 用 314B MoE 建立第一代开放技术坐标",
    fact: "xAI 于 2024 年 3 月发布 Grok-1 基础模型权重与网络架构，采用 Apache 2.0 许可。",
    summary:
      "Grok 首次从 X 平台产品变成可下载、可检查的模型资产，让外部开发者能够验证 xAI 的早期技术路线；这也是理解其后续从开放权重转向闭源 API 的基准节点。",
    technical:
      "Grok-1 是 314B 参数的 Mixture-of-Experts 基础模型，每次处理激活约 25% 权重；官方说明该检查点未经对话微调，训练栈基于 JAX 与 Rust。",
    industry:
      "新实验室通过开放大模型权重快速获得开发者关注，但早期基础模型的可用性不能代表后续商业模型的能力。",
    future:
      "观察 xAI 是否继续开放后续模型、社区能否形成高质量推理与微调工具，以及开放路线与 Grok 商业产品之间是否保持连接。",
    business:
      "技术负责人可把开放权重用于架构研究和离线实验，但不能直接据此推断 Grok 在线产品的质量、合规能力或长期许可策略。",
    category: "open-source",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok-1", "xAI", "SpaceXAI", "开放权重", "MoE"],
    scores: [99, 0, 86, 82],
    date: "2024-03-17T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-os",
    tracks: ["tech-evolution", "global-innovation", "to-d"],
    actors: [],
  }),
  event({
    slug: "grok-2-search-citations-free-rollout",
    title: "Grok-2 向所有 X 用户开放：实时搜索与引用成为产品差异点",
    fact: "xAI 于 2024 年 12 月宣布升级版 Grok-2 向所有 X 用户免费开放，并加入网页与 X 搜索结果引用。",
    summary:
      "Grok 的竞争位置从订阅专属聊天模型转向依托 X 分发和实时信息的通用入口；免费层扩大了产品覆盖，引用机制则把可核验性带进实时问答体验。",
    technical:
      "升级版 Grok-2 强化准确性、指令遵循和多语言能力，并将 X 帖子与网页检索结果接入回答，向用户显示可继续核验的引用。",
    industry:
      "拥有实时内容平台的模型厂商可以把分发、数据新鲜度和生成体验结合，但信息质量仍取决于检索排序、来源独立性和引用准确度。",
    future:
      "观察免费用户留存、搜索引用点击率、错误信息纠正速度，以及 X 平台内容在高风险事实问题中的治理表现。",
    business:
      "产品团队评估实时模型时，应分开测试模型知识、检索覆盖和引用可信度，不能把‘能搜索’直接等同于‘答案可靠’。",
    category: "product-release",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok-2", "xAI", "SpaceXAI", "X 搜索", "引用"],
    scores: [98, 0, 88, 86],
    date: "2024-12-12T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-1212",
    tracks: ["commercialization", "to-c", "global-innovation"],
    actors: [],
  }),
  event({
    slug: "grok-3-reasoning-agents",
    title: "Grok 3 发布：xAI 把大规模预训练推进到推理与搜索 Agent",
    fact: "xAI 于 2025 年 2 月发布 Grok 3、Grok 3 mini 及其 Think 推理版本，并预告 API 与 DeepSearch。",
    summary:
      "Grok 进入推理模型竞争，产品不再只强调实时知识和表达风格，而是把强化学习、推理时计算、长上下文与搜索工具组合成 Agent 能力。",
    technical:
      "官方披露 Grok 3 使用 Colossus 集群训练，支持 1M 上下文；Think 版本通过强化学习学习回溯、验证和多路径求解，并可按任务投入更长推理时间。",
    industry:
      "前沿模型的竞争开始同时考验预训练规模、推理时计算和工具使用，单一静态 benchmark 更难解释真实任务能力。",
    future: "观察 API 的稳定性、DeepSearch 引用质量、工具调用成功率和不同推理预算下的成本曲线。",
    business:
      "采购方需要按真实任务比较 Grok 3 的成功率、延迟和搜索证据质量，而不是直接采用厂商发布时的峰值分数。",
    category: "reasoning",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 3", "xAI", "SpaceXAI", "Think", "DeepSearch"],
    scores: [99, 0, 94, 91],
    date: "2025-02-19T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-3",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-c", "to-d"],
    actors: [],
  }),
  event({
    slug: "glm-4-32b-open-reasoning",
    title: "GLM-4-32B 开放：智谱补齐中等规模推理与批处理模型",
    fact: "智谱 GLM 团队于 2025 年 4 月开放 GLM-4-32B-0414 系列，覆盖对话、推理与沉思版本。",
    summary:
      "智谱在旗舰 API 之外持续提供可下载模型，使企业和开发者能够在自部署、批处理与中文任务中验证 GLM 路线，而不是只能依赖单一云端产品。",
    technical:
      "该系列以 32B 参数和 32K 原生上下文为基础，面向翻译等大批量任务优化，并提供不同推理形态与公开部署入口。",
    industry:
      "中国模型厂商开始用更完整的尺寸和推理模式覆盖云 API 与私有部署市场，开放权重成为开发者分发和国产算力适配的重要接口。",
    future:
      "观察真实中文业务质量、推理框架适配、量化后的长尾损失，以及开放模型与商业 API 的版本同步速度。",
    business:
      "技术团队可将其纳入本地部署候选，但需要把吞吐、显存、维护和升级成本与托管 API 一并核算。",
    category: "open-source",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-4-32B", "开放权重"],
    scores: [98, 0, 84, 85],
    date: "2025-04-14T00:00:00.000Z",
    source: "zai-glm4-updates",
    url: "https://github.com/zai-org/GLM-4",
    tracks: ["tech-evolution", "global-innovation", "model-economics", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "grok-4-native-tool-use",
    title: "Grok 4 发布：原生工具使用与大规模强化学习成为主线",
    fact: "xAI 于 2025 年 7 月发布 Grok 4 与 Grok 4 Heavy，并通过 Grok 产品和 API 提供访问。",
    summary:
      "Grok 4 把推理训练、代码解释器、网页浏览和 X 搜索整合为统一模型能力，xAI 的竞争重点由模型聊天体验转向可调用工具的研究与执行系统。",
    technical:
      "官方称 Grok 4 在 Colossus 上扩大强化学习训练，并以原生工具使用处理跨领域可验证任务；Heavy 版本通过更高计算预算扩展结果质量。",
    industry:
      "前沿实验室开始把搜索、代码和任务执行作为模型训练目标，而非发布后外挂能力，Agent 可靠性成为新一轮差异化焦点。",
    future: "观察工具选择准确率、搜索来源覆盖、长任务失败恢复、Heavy 模式成本与第三方可复现评测。",
    business:
      "企业试点应记录每次任务的工具调用链、失败位置和人工接管，避免用单轮推理榜单替代生产验收。",
    category: "model-release",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 4", "Grok 4 Heavy", "xAI", "SpaceXAI", "工具使用"],
    scores: [99, 0, 96, 94],
    date: "2025-07-09T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-4",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-d"],
    actors: [],
  }),
  event({
    slug: "glm-4-5-unified-agentic-model",
    title: "GLM-4.5 开源：智谱把推理、代码与 Agent 合并为统一模型",
    fact: "智谱于 2025 年 7 月发布 GLM-4.5 与 GLM-4.5-Air，并同时提供 API 和开放权重。",
    summary:
      "GLM-4.5 标志智谱从通用对话模型转向面向 Agent 的统一基础模型，并通过开放权重、国内外 API 和主流编码 Agent 兼容扩大开发者覆盖。",
    technical:
      "GLM-4.5 为 355B 总参数、32B 激活参数的 MoE，Air 版本为 106B/12B；两者支持 thinking 与 non-thinking 模式、128K 上下文和原生函数调用。",
    industry:
      "国产模型竞争从单项榜单进入能力、开放许可、推理效率和工具生态的组合竞争，也开始直接进入全球编码 Agent 供应链。",
    future: "观察开放权重下载后的真实部署、Agent 工具成功率、海外开发者采用和 API 服务稳定性。",
    business:
      "开发者可用同一模型覆盖快速响应与复杂推理，但应分别验证两种模式的质量、延迟、成本和工具行为。",
    category: "model-release",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-4.5", "Agent"],
    scores: [99, 0, 94, 94],
    date: "2025-07-28T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-4.5",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "glm-4-6-agentic-coding",
    title: "GLM-4.6 发布：智谱强化长上下文编码与搜索 Agent",
    fact: "智谱于 2025 年 9 月发布 GLM-4.6，将上下文窗口从 128K 扩展到 200K，并增强编码、推理和工具使用。",
    summary:
      "智谱把模型迭代重点从参数规模转向真实编码轨迹、上下文效率与 Agent 集成，开始用公开任务轨迹支撑对工程能力的说明。",
    technical:
      "GLM-4.6 支持推理中工具使用和搜索 Agent；官方同时公开 CC-Bench 轨迹，并报告相较 GLM-4.5 使用更少 token 完成真实编码任务。",
    industry:
      "模型厂商越来越需要展示可复查的任务轨迹、成本和失败分布，而不是只公布最终分数；编码 Agent 也成为中国模型走向海外开发者的主要入口。",
    future:
      "观察公开轨迹的覆盖范围、复杂仓库成功率、长上下文稳定性和在 Claude Code 等框架中的长期留存。",
    business:
      "技术负责人应复用同一批内部仓库任务比较不同模型，并记录 token、重试、修改正确率和人工审查时间。",
    category: "coding-agent",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-4.6", "编码 Agent"],
    scores: [99, 0, 92, 94],
    date: "2025-09-30T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-4.6",
    tracks: ["tech-evolution", "commercialization", "global-innovation", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "grok-4-1-fast-enterprise-tools",
    title: "Grok 4.1 Fast 进入企业 API：搜索、代码与远程 MCP 工具合流",
    fact: "xAI 于 2025 年 11 月在企业 API 提供 Grok 4.1 Fast，并让 Agent 工具支持该模型。",
    summary:
      "Grok 的商业化开始从消费端订阅扩展到企业 API 和可组合工具层；同期上线的 Files、Collections Search 与远程 MCP 使模型更接近企业 Agent 平台。",
    technical:
      "官方 Release Notes 记录 Grok 4.1 Fast、远程 MCP、集合搜索及客户端与服务端工具混用能力，形成模型、知识库与工具调用的统一接口。",
    industry:
      "模型厂商正在占据 Agent runtime 的关键控制点，企业采购不再只是选模型，还要评估工具权限、知识库、审计和迁移成本。",
    future: "观察远程 MCP 的权限隔离、工具调用计费、企业 SLA 和旧模型迁移策略。",
    business:
      "平台团队应把模型与工具层解耦，保留可替换接口，并对远程工具设置最小权限、审计与失败回滚。",
    category: "developer-platform",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 4.1 Fast", "xAI", "SpaceXAI", "MCP", "Enterprise API"],
    scores: [99, 0, 90, 93],
    date: "2025-11-19T00:00:00.000Z",
    source: "xai-release-notes",
    url: "https://docs.x.ai/developers/release-notes",
    tracks: ["commercialization", "tech-evolution", "to-b", "to-d"],
    actors: [],
  }),
  event({
    slug: "glm-4-6v-multimodal-tool-use",
    title: "GLM-4.6V 开源：智谱让视觉理解直接进入工具调用",
    fact: "智谱于 2025 年 12 月发布并开源 GLM-4.6V 与 9B 的 GLM-4.6V-Flash。",
    summary:
      "多模态模型从识图问答推进到视觉驱动的工具使用，智谱试图把截图、文档、图表和界面理解连接到可执行 Agent 工作流。",
    technical:
      "GLM-4.6V 在 128K 上下文中加入原生多模态 Function Calling，支持把图片、截图和文档页作为工具输入，并解释工具返回的视觉结果。",
    industry:
      "视觉 Agent 的竞争焦点从识别准确率转向界面理解、动作规划和工具执行结果，轻量版本也扩大了本地部署和低延迟场景。",
    future: "观察 GUI 操作成功率、视觉提示注入防护、文档长链任务和 9B 版本在端侧的真实吞吐。",
    business: "适合先在可回滚的文档和后台流程试点，涉及支付、删除或外部发布时仍需明确人工确认。",
    category: "multimodal",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-4.6V", "多模态工具"],
    scores: [99, 0, 91, 91],
    date: "2025-12-08T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-4.6v",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "glm-4-7-preserved-thinking",
    title: "GLM-4.7 发布：跨工具步骤保留推理状态，面向长链编码 Agent",
    fact: "智谱于 2025 年 12 月发布并开放 GLM-4.7 权重，重点增强编码、工具使用与多步推理。",
    summary:
      "GLM-4.7 将竞争焦点推进到 Agent 多轮执行中的状态保持：模型需要在连续工具调用之间复用已有推理，而不是每一步重新开始。",
    technical:
      "官方介绍 Interleaved Thinking、Preserved Thinking 与 Turn-level Thinking，使模型可在工具调用前思考、跨轮保留 thinking blocks，并按轮控制推理预算。",
    industry:
      "编码 Agent 的瓶颈从单次生成质量转向长链一致性、状态压缩和失败恢复，模型接口也开始暴露更细的推理控制。",
    future: "观察保留推理对 token 成本、错误累积、隐私泄露和长任务成功率的真实影响。",
    business:
      "工程团队应把任务拆成可审计阶段，并检查保留状态是否减少重复工作，同时避免把不可信中间推理长期带入后续步骤。",
    category: "coding-agent",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-4.7", "Preserved Thinking"],
    scores: [99, 0, 93, 94],
    date: "2025-12-22T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-4.7",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "xai-series-e-compute-scale",
    title: "xAI 完成 200 亿美元 Series E：模型竞争继续绑定资本与算力规模",
    fact: "xAI 于 2026 年 1 月宣布完成 200 亿美元 Series E，并披露 Colossus I 与 II 的扩张进展。",
    summary:
      "巨额融资把 Grok 的模型路线与数据中心、GPU 供应和企业扩张绑定在一起。xAI 既要保持模型发布速度，也要持续承担训练和推理的资本开支。",
    technical:
      "官方将 Grok 4 系列的大规模强化学习与 Colossus 基础设施列为核心进展，并称集群规模达到超过一百万个 H100 等效 GPU。",
    industry:
      "前沿实验室的技术迭代与资本结构进一步耦合，算力获得、利用率和产品收入共同决定训练规模能否转化为长期优势。",
    future: "观察融资后的数据中心交付、推理利用率、企业收入、资本消耗和模型发布节奏。",
    business:
      "投资判断应把官方算力规模与实际利用率、收入和单位模型改进分开验证，不能把基础设施投入直接视为产品领先。",
    category: "funding",
    company: "xAI / Grok",
    keywords: ["Grok", "xAI", "SpaceXAI", "Series E", "Colossus", "融资"],
    scores: [99, 0, 94, 92],
    date: "2026-01-06T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/series-e",
    tracks: ["investing", "tech-evolution", "commercialization"],
    actors: [],
  }),
  event({
    slug: "glm-5-agentic-engineering",
    title: "GLM-5 开源：智谱从代码生成转向长时系统工程",
    fact: "智谱于 2026 年 2 月发布 GLM-5，并以 MIT 许可开放权重，同时提供国内外 API。",
    summary:
      "GLM-5 把模型定位从 Vibe Coding 推向 Agentic Engineering，强调复杂系统工程、长时任务与可持续优化，成为智谱全球开发者路线的重要升级。",
    technical:
      "GLM-5 采用 744B 总参数、40B 激活参数，预训练数据扩展到 28.5T token，引入 DeepSeek Sparse Attention，并使用异步 RL 基础设施 slime 提升后训练效率。",
    industry:
      "中国开放模型在规模、许可与 Agent 工程目标上继续逼近全球前沿，同时推动国产芯片、推理框架和编码工具适配。",
    future: "观察真实长时任务的完成率、MIT 生态采用、非 NVIDIA 部署效率和 API 高并发稳定性。",
    business:
      "企业应优先选择能完整覆盖测试、修复和交付的工程任务，并按小时级成功结果评估价值，代码生成量只能作为辅助指标。",
    category: "model-release",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-5", "Agentic Engineering"],
    scores: [99, 0, 96, 96],
    date: "2026-02-12T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-5",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "to-d", "investing"],
    actors: ["zhipu"],
  }),
  event({
    slug: "grok-4-20-multi-agent-api",
    title: "Grok 4.20 Multi-agent 上线：xAI 将并行 Agent 编排产品化",
    fact: "xAI 官方 Release Notes 记录 Grok 4.20 与 Grok 4.20 Multi-agent 于 2026 年 3 月进入 API。",
    summary:
      "xAI 把多 Agent 从实验架构变成可调用模型选项，企业可以直接购买并行任务分解能力，但也需要面对更高调用成本、协调错误与证据合并风险。",
    technical:
      "官方模型目录为 Grok 4.20 系列提供 1M 上下文和可配置推理形态；Multi-agent 版本将多个执行路径组合为单一 API 能力。",
    industry:
      "模型供应商开始向上占据 Agent orchestration 层，框架公司与应用团队需要重新判断自建编排相对厂商托管能力的价值。",
    future: "观察并行路径的独立性、冲突解决、token 放大、延迟和相对单 Agent 的实际成功率提升。",
    business:
      "仅在可并行且结果可验证的高价值任务中试用，并记录每个子任务的来源、失败与合并过程，避免把更多调用误当作更高质量。",
    category: "agent-platform",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 4.20", "xAI", "SpaceXAI", "Multi-agent", "多智能体"],
    scores: [99, 0, 94, 93],
    date: "2026-03-10T00:00:00.000Z",
    source: "xai-release-notes",
    url: "https://docs.x.ai/developers/release-notes",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-b", "to-d"],
    actors: [],
  }),
  event({
    slug: "glm-5-1-eight-hour-agent",
    title: "GLM-5.1 发布：智谱把 Agent 目标推进到 8 小时持续执行",
    fact: "智谱官方 Release Notes 于 2026 年 4 月记录 GLM-5.1 发布，定位为长时任务旗舰模型。",
    summary:
      "智谱开始用持续执行时长、反复优化和工程交付衡量模型升级。8 小时目标也让状态漂移、错误累积和安全边界成为产品重点。",
    technical:
      "官方文档列出 200K 上下文、128K 最大输出、函数调用、MCP 与多档思考模式，并称模型可在单任务上持续执行最长 8 小时。",
    industry:
      "模型评测从分钟级 benchmark 走向小时级真实任务，Agent runtime、沙箱、成本控制和过程评估的重要性同步上升。",
    future: "观察 8 小时任务的公开轨迹、成功率分布、策略漂移、资源成本和发生错误后的可恢复性。",
    business:
      "企业应先建立阶段检查点、预算上限和人工接管，再扩大长时自治范围；持续运行时长本身不是业务价值。",
    category: "agent-platform",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-5.1", "长时 Agent"],
    scores: [99, 0, 95, 96],
    date: "2026-04-07T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://docs.z.ai/release-notes/new-released",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "to-b", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "grok-build-coding-agent",
    title: "Grok Build 发布：xAI 从模型 API 进入终端编码 Agent",
    fact: "xAI 于 2026 年 5 月发布 Grok Build 早期测试版，为订阅用户提供终端编码 Agent。",
    summary:
      "xAI 开始直接占据软件开发入口，将 Grok 模型、规划审批、代码执行与多 Agent 工作流封装为产品，竞争边界扩展到开发者工具和工程交付。",
    technical:
      "Grok Build 以 CLI 运行，支持 Plan、人工审批和并行 subagents，并与本地代码库和现有终端工作流连接。",
    industry:
      "前沿模型公司持续向上进入编码 Agent 产品层，独立工具的差异化需要来自上下文管理、企业治理、模型中立或专有工作流。",
    future: "观察真实 PR 合并率、代码安全、长任务恢复、模型锁定和团队级审计能力。",
    business:
      "工程团队应在隔离仓库内评估计划质量、测试通过率和审查时间，并默认保留人工批准与最小权限。",
    category: "coding-agent",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok Build", "xAI", "SpaceXAI", "编码 Agent", "CLI"],
    scores: [99, 0, 94, 96],
    date: "2026-05-25T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-build-cli",
    tracks: ["tech-evolution", "commercialization", "to-d"],
    actors: [],
  }),
  event({
    slug: "glm-5-2-million-context",
    title: "GLM-5.2 开源：智谱把 1M 上下文用于长时工程任务",
    fact: "智谱于 2026 年 6 月发布 GLM-5.2，以 MIT 许可开放权重，并提供 1M 上下文版本。",
    summary:
      "GLM-5.2 不再只把长上下文作为容量参数，而是围绕小时级编码、研究和系统优化训练与评测，进一步强化智谱的开放 Agent 工程路线。",
    technical:
      "模型引入 IndexShare 以降低稀疏注意力索引计算，并改进 MTP speculative decoding；官方同时披露长时 RL、反作弊和超长上下文推理服务设计。",
    industry:
      "开放模型开始公开长时训练、评测防作弊与推理服务细节，竞争从接受更多 token 转向在复杂轨迹中保持质量和成本可控。",
    future:
      "观察 1M 上下文下的质量衰减、KV cache 成本、长任务失败率、社区复现与不同硬件的生产吞吐。",
    business:
      "长上下文适合大型代码库和多文档任务，但应通过检索、压缩和阶段验收控制无效输入与尾部成本。",
    category: "model-release",
    company: "智谱 AI / Z.ai",
    keywords: ["智谱", "Zhipu", "Z.ai", "GLM", "GLM-5.2", "1M 上下文"],
    scores: [99, 0, 97, 97],
    date: "2026-06-16T00:00:00.000Z",
    source: "zai-release-notes",
    url: "https://z.ai/blog/glm-5.2",
    tracks: ["tech-evolution", "agi-progress", "global-innovation", "model-economics", "to-d"],
    actors: ["zhipu"],
  }),
  event({
    slug: "grok-4-3-amazon-bedrock",
    title: "Grok 进入 Amazon Bedrock：xAI 获得企业云分发与治理入口",
    fact: "xAI 于 2026 年 6 月宣布 Grok 4.3 在 Amazon Bedrock 正式可用。",
    summary:
      "Grok 从自有产品与 API 扩展到主流企业云模型市场，客户可以通过既有 AWS 账户、权限和推理基础设施采用模型，分发和治理能力明显增强。",
    technical:
      "官方介绍 Grok 4.3 提供 1M 上下文和可配置推理强度，并通过 Bedrock 的托管推理环境面向企业 Agent 场景。",
    industry:
      "前沿模型的企业竞争越来越依赖云市场、合规集成和采购路径，直接 API 的性能优势必须与渠道和治理成本一起比较。",
    future: "观察 Bedrock 区域覆盖、实际调用量、企业 SLA、价格差异和与 AWS Agent 服务的集成深度。",
    business:
      "已有 AWS 治理体系的团队可以降低试点接入成本，但仍需比较直连 API 与 Bedrock 在模型版本、功能、延迟和价格上的差异。",
    category: "commercialization",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 4.3", "xAI", "SpaceXAI", "Amazon Bedrock", "企业分发"],
    scores: [99, 0, 92, 94],
    date: "2026-06-17T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-amazon-bedrock",
    tracks: ["commercialization", "investing", "to-b", "to-d"],
    actors: [],
  }),
  event({
    slug: "grok-4-5-agentic-work",
    title: "Grok 4.5 发布：xAI 将代码、Agent 与 Office 工作合并为旗舰模型",
    fact: "xAI 于 2026 年 7 月发布 Grok 4.5，并通过 API、Grok Build、Cursor 与 Office 插件提供使用。",
    summary:
      "Grok 4.5 同时进入编码 Agent、开发者 API、办公文档和第三方工具。相比单项模型分数，这种跨入口部署更能说明 xAI 正在建设统一执行层。",
    technical:
      "官方披露模型面向软件工程和长时 Agent rollout 训练，提供可配置推理强度、500K 上下文，并强调 token 效率与快速推理服务。",
    industry:
      "前沿模型公司正把训练、模型、Agent runtime 和分发产品进一步整合，应用层需要证明其专有流程、数据和完整交付能力。",
    future:
      "观察独立编码评测、Office 任务真实成功率、EU 可用性、API 稳定性和每个完成任务的总成本。",
    business:
      "企业应按编码、文档和研究三类任务分别验收，不应因统一入口而省略权限、数据边界和人工复核设计。",
    category: "model-release",
    company: "xAI / Grok",
    keywords: ["Grok", "Grok 4.5", "xAI", "SpaceXAI", "Grok Build", "Office Agent"],
    scores: [99, 0, 97, 97],
    date: "2026-07-08T00:00:00.000Z",
    source: "xai",
    url: "https://x.ai/news/grok-4-5",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-b", "to-d"],
    actors: [],
  }),
] as const satisfies readonly CuratedEventSeed[];
