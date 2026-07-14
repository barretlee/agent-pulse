import type { CuratedEventSeed } from "./history.js";

const researchEvent = (value: CuratedEventSeed): CuratedEventSeed => value;

/**
 * 2026 research selected from direct lab publications rather than monthly arXiv volume.
 * Each entry is backed by an official research page plus a paper, publication, code, or deployment artifact.
 */
export const directResearchHistory2026 = [
  researchEvent({
    slug: "microsoft-argos-agentic-verifier",
    title: "Argos：多模态 Agent 的强化学习开始同时验证答案、证据定位与推理过程",
    fact: "Microsoft Research 于 2026 年 1 月发布 Argos，使用可选择专用评分工具的 Agentic Verifier，为多模态强化学习同时提供答案正确性、时空定位与推理质量奖励。",
    summary:
      "只奖励最终答案会让多模态 Agent 学会猜对结果，却忽略图像和视频证据。Argos 把验证器直接放进数据筛选与强化学习环节，使训练目标从结果正确扩展到过程有据可查。",
    technical:
      "Argos 按样本组合规则评分器与教师模型，检查最终答案、对象的空间位置、事件的时间位置以及推理是否与观察一致。Microsoft 报告其在空间推理、视觉幻觉、机器人规划和具身任务中改善表现，并减少仅依赖结果奖励时出现的 reward hacking。",
    industry:
      "多模态 Agent 进入机器人、驾驶与桌面执行后，验证器会成为训练和上线评测的独立基础设施；仅有任务成功率不足以证明系统在新环境中可靠。",
    future:
      "需要独立复现其跨模型和真实机器人收益，并继续测量教师模型偏差、验证成本、错误奖励及对长任务泛化的影响。",
    business:
      "评估视觉或机器人 Agent 时，应要求供应商提供答案正确率、证据定位、推理一致性和 reward hacking 的分项结果，而不是只展示最终任务成功率。",
    category: "research",
    company: "Microsoft Research",
    keywords: ["Argos", "多模态 Agent", "强化学习", "验证器", "具身智能"],
    scores: [96, 0, 88, 86],
    date: "2026-01-20T00:00:00.000Z",
    source: "microsoft-research",
    url: "https://www.microsoft.com/en-us/research/blog/multimodal-reinforcement-learning-with-agentic-verifier-for-ai-agents/",
    tracks: ["tech-evolution", "agi-progress", "to-d", "to-b"],
    actors: [],
  }),
  researchEvent({
    slug: "openai-gabriel-measurement-tool",
    title: "GABRIEL：OpenAI 将非结构化材料的量化编码做成可审计研究工具",
    fact: "OpenAI Economic Research 于 2026 年 2 月发布 GABRIEL 论文与开源工具，把文本、图像和音频中的定性属性转成可重复的量化测量，并提供批处理、重试、检查点和审计轨迹。",
    summary:
      "大模型辅助研究长期停留在一次性标注脚本。GABRIEL 把提示、批处理、恢复、验证和记录组织成标准工具，使社会科学与行业研究可以把模型判断当作需要校准和审计的测量过程。",
    technical:
      "工具覆盖 rating、ranking、classification、extraction、deduplication 与 de-identification，并在论文中用多类任务验证 GPT 标注质量。官方仓库持续发布版本，说明研究成果已经从方法论转成可复用软件资产。",
    industry:
      "咨询、市场研究、政策分析和知识管理团队可以更低成本处理大规模定性材料，但必须保留抽样复核、模型版本、原始依据与偏差评估。",
    future:
      "重点观察跨语言和高风险领域的可靠性、不同模型版本的测量漂移，以及第三方能否复现论文中的准确率与偏差结论。",
    business:
      "使用 LLM 做批量研究时，应把 GABRIEL 类审计轨迹、断点恢复和人工校准能力列入采购要求，避免不可复现的一次性分析。",
    category: "research",
    company: "OpenAI Economic Research",
    keywords: ["GABRIEL", "社会科学", "量化测量", "开源工具", "审计"],
    scores: [98, 0, 87, 91],
    date: "2026-02-13T00:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/scaling-social-science-research/",
    tracks: ["tech-evolution", "commercialization", "to-b", "to-g"],
    actors: ["openai"],
  }),
  researchEvent({
    slug: "anthropic-observed-ai-labor-exposure",
    title: "Anthropic 劳动力研究：用真实 Claude 使用数据区分理论可自动化与实际暴露",
    fact: "Anthropic 于 2026 年 3 月提出 observed exposure 指标，将任务理论能力、真实 Claude 使用、工作场景与自动化程度组合，并与美国职业和就业数据比较。",
    summary:
      "AI 对就业的讨论常把模型理论能力直接等同实际替代。该研究用真实使用数据缩小这一跳跃，发现当前实际覆盖仍显著低于理论能力，也未观察到高暴露职业失业率系统性上升。",
    technical:
      "研究将 O*NET 任务、Anthropic Economic Index 使用数据和任务级理论暴露结合，对工作相关且自动化程度更高的使用赋予更高权重，再聚合到职业层级。结果显示暴露与官方就业增长预测弱相关，同时只对年轻高暴露职业的招聘放缓给出提示性证据。",
    industry:
      "企业与投资判断可以从静态的岗位可替代比例转向真实任务采用、自动化方式和扩散速度；这比单纯使用 benchmark 或专家预测更接近经营变化。",
    future:
      "数据只覆盖 Claude 生态且因果识别有限，需要与其他平台、企业部署、工资、岗位转换和长期就业数据持续交叉验证。",
    business:
      "制定人力策略时应按任务追踪真实使用和自动化深度，不应根据模型能力榜单直接裁减岗位；优先寻找采用增长但组织流程尚未适配的环节。",
    category: "research",
    company: "Anthropic Economic Research",
    keywords: ["劳动力", "AI 暴露", "真实使用", "就业", "Anthropic Economic Index"],
    scores: [97, 0, 91, 95],
    date: "2026-03-05T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/research/labor-market-impacts",
    tracks: ["commercialization", "investing", "to-b", "to-g"],
    actors: ["anthropic"],
  }),
  researchEvent({
    slug: "google-reasoningbank-agent-memory",
    title: "ReasoningBank：Agent 记忆从保存轨迹转向提炼成功与失败中的可迁移策略",
    fact: "Google Research 于 2026 年 4 月介绍 ICLR 论文 ReasoningBank，通过检索、经验提炼和记忆整合闭环，让 Agent 从成功与失败轨迹中形成结构化推理策略。",
    summary:
      "现有 Agent 记忆经常保存事实或完整操作轨迹，却没有把失败转成下次可执行的策略。ReasoningBank 把经验压缩为跨任务可复用的推理规则，使 test-time learning 成为持续 Agent 的新能力层。",
    technical:
      "每条记忆包含标题、描述与推理内容；Agent 执行前检索策略，完成后自评轨迹并提炼成功经验或失败反思，再把新规则合并回记忆库。论文在网页浏览与软件工程基准上同时报告成功率提升和任务步数下降，并公开代码。",
    industry:
      "长期运行 Agent 的竞争将从上下文长度扩展到经验治理：哪些失败值得记住、如何合并冲突规则、何时撤销过时经验，都会影响真实任务成本与稳定性。",
    future:
      "需要验证自评错误和恶意轨迹是否会污染记忆，并比较真实企业任务中的长期收益、记忆维护成本与跨模型迁移能力。",
    business:
      "采购持续 Agent 时应要求展示跨周任务复用、失败不重复率、记忆撤销和审计能力，而不是只声明支持长期记忆。",
    category: "research",
    company: "Google Research",
    keywords: ["ReasoningBank", "Agent 记忆", "test-time learning", "经验提炼", "ICLR"],
    scores: [97, 0, 90, 91],
    date: "2026-04-21T00:00:00.000Z",
    source: "google-research",
    url: "https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/",
    tracks: ["tech-evolution", "agi-progress", "to-d", "to-b"],
    actors: ["google"],
  }),
  researchEvent({
    slug: "google-era-empirical-research-assistance",
    title: "ERA 登上 Nature：AI 科学助手开始自动编写并优化专家级实证研究代码",
    fact: "Google Research 于 2026 年 5 月公布 ERA 的 Nature 论文、代码和实验，并将其用于 Computational Discovery 原型，以树搜索探索和优化科学计算方案。",
    summary:
      "AI for Science 从文献问答和假设生成进入实证代码执行。ERA 能搜索方法、编写代码、运行实验和比较结果，使科学 Agent 第一次以正式出版和可运行代码同时接受检验。",
    technical:
      "ERA 根据问题与成功指标搜索大量候选方案，组合既有方法并迭代优化程序。Nature 论文报告其在多类实证任务中的专家级表现；官方同时公开应用代码，并把成果接入 Gemini for Science 的受控实验产品。",
    industry:
      "科研软件、数据分析和高价值研发流程可能形成新的 Agent 平台层，但结果可信度将取决于实验可复现、数据治理、领域专家复核和计算成本。",
    future:
      "需要独立团队复现实验，并观察受控试用中的真实发现率、错误假设、代码安全、数据泄漏与专家节省时间。",
    business:
      "研发组织应从可验证的小型计算实验开始试点科学 Agent，以复现成功率和研究周期缩短为指标，而非按生成代码量评价。",
    category: "research",
    company: "Google Research",
    keywords: ["ERA", "AI for Science", "Nature", "科学 Agent", "实证研究"],
    scores: [99, 0, 96, 94],
    date: "2026-05-19T00:00:00.000Z",
    source: "google-research",
    url: "https://research.google/blog/empirical-research-assistance-era-from-nature-publication-to-catalyzing-computational-discovery/",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-b", "to-d"],
    actors: ["google"],
  }),
  researchEvent({
    slug: "openai-deployment-simulation",
    title: "Deployment Simulation：OpenAI 用真实分布模拟在发布前预测模型风险",
    fact: "OpenAI 于 2026 年 6 月发布 Deployment Simulation 论文，使用去标识的历史对话为待发布模型重生成回答，并把模拟频率与发布后的真实风险频率比较。",
    summary:
      "传统安全评测偏向人工挑选的困难样本，难以估计风险在真实流量中的发生率。Deployment Simulation 把生产分布引入发布前验证，让模型风险评测从是否会失败扩展到实际多久失败一次。",
    technical:
      "研究在多代 GPT-5 Thinking 部署上重放隐私处理后的对话前缀，评估 20 类不良行为的方向与频率校准，并扩展到包含工具调用的 Agent 轨迹。官方披露约 130 万段去标识对话用于验证，同时明确无法测量低于约二十万分之一的罕见风险。",
    industry:
      "前沿模型发布门禁正在从静态 benchmark 转向接近生产分布的连续仿真；拥有真实流量和完善隐私治理的平台会获得评测数据优势。",
    future:
      "需要外部审计其隐私处理、样本代表性和 grader 偏差，并验证当产品形态或用户群变化时历史流量是否仍能预测新风险。",
    business:
      "企业发布高风险 Agent 前应使用真实但去标识的历史任务做影子重放，比较新旧系统失败率，并为低频高损失风险保留专门压力测试。",
    category: "research",
    company: "OpenAI",
    keywords: ["Deployment Simulation", "模型安全", "真实分布", "Agent 评测", "风险预测"],
    scores: [99, 0, 95, 95],
    date: "2026-06-16T00:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/deployment-simulation/",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-b", "to-g"],
    actors: ["openai"],
  }),
  researchEvent({
    slug: "anthropic-global-workspace-language-models",
    title: "Global Workspace：Anthropic 在语言模型内部识别出可报告、可干预的隐式推理空间",
    fact: "Anthropic 于 2026 年 7 月发布 Global Workspace 研究，通过 Jacobian lens 识别 Claude 的 J-space，并用干预实验验证其中表示会因果影响报告、内部推理和决策。",
    summary:
      "模型可解释性通常只能找到与概念相关的神经元，难以证明其参与决策。该研究找到一组规模较小、可被模型报告和主动调节的内部表示，并通过替换表示改变模型输出，为观察隐式推理提供新工具。",
    technical:
      "J-lens 根据词汇输出的 Jacobian 定位潜在可表达表示；研究测试了可报告性、可控制性、推理参与、跨任务复用和因果中介，并公开核心代码、交互演示与外部专家评论。作者同时强调这不构成模型具有意识的证据。",
    industry:
      "如果方法可跨模型复现，可解释性工具可能从事后特征可视化走向上线前检测隐藏目标、评测识别和欺骗行为，但当前结论主要来自 Anthropic 自有模型。",
    future:
      "重点关注 Google DeepMind 等独立团队的复现、开放权重模型结果、干预稳定性，以及模型是否能学习规避这类内部检测。",
    business:
      "高风险模型治理应关注可解释方法是否具备因果干预和跨模型复现，而不是把漂亮的激活图直接当作安全证明。",
    category: "research",
    company: "Anthropic",
    keywords: ["Global Workspace", "J-space", "可解释性", "隐式推理", "因果干预"],
    scores: [98, 0, 95, 89],
    date: "2026-07-06T00:00:00.000Z",
    source: "anthropic",
    url: "https://www.anthropic.com/research/global-workspace",
    tracks: ["tech-evolution", "agi-progress", "to-d", "to-g"],
    actors: ["anthropic"],
  }),
] as const satisfies readonly CuratedEventSeed[];
