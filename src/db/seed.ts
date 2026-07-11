import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { Repository } from "./repository.js";
import type { DatabaseSchema } from "./types.js";

const isoNow = () => new Date().toISOString();
const stableId = (namespace: string, slug: string) => {
  const hash = createHash("sha256").update(`${namespace}:${slug}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const sources = [
  [
    "aihot",
    "AI HOT",
    "https://aihot.virxact.com",
    "aihot",
    2,
    "aggregator",
    "CN",
    "zh-CN",
    72,
    1,
    { url: "https://aihot.virxact.com/api/public/items", mode: "selected", take: 50 },
  ],
  [
    "huggingnews",
    "HuggingNews",
    "https://huggingnews.com",
    "huggingnews",
    3,
    "heat",
    "GLOBAL",
    "en",
    60,
    0,
    { url: "https://huggingnews.com", take: 40, homepageOnly: true },
  ],
  [
    "openai",
    "OpenAI",
    "https://openai.com/news/",
    "rss",
    1,
    "primary",
    "GLOBAL",
    "en",
    98,
    1,
    { url: "https://openai.com/news/rss.xml", take: 50 },
  ],
  [
    "deepmind",
    "Google DeepMind",
    "https://deepmind.google/blog/",
    "rss",
    1,
    "primary",
    "GLOBAL",
    "en",
    97,
    1,
    { url: "https://deepmind.google/blog/rss.xml", take: 50 },
  ],
  [
    "huggingface",
    "Hugging Face",
    "https://huggingface.co/blog",
    "rss",
    1,
    "primary",
    "GLOBAL",
    "en",
    91,
    1,
    { url: "https://huggingface.co/blog/feed.xml", take: 50 },
  ],
  [
    "arxiv-ai",
    "arXiv cs.AI",
    "https://arxiv.org/list/cs.AI/recent",
    "rss",
    1,
    "paper",
    "GLOBAL",
    "en",
    86,
    1,
    { url: "https://rss.arxiv.org/rss/cs.AI", category: "paper", take: 50 },
  ],
  [
    "hackernews-ai",
    "Hacker News · AI",
    "https://news.ycombinator.com",
    "rss",
    4,
    "heat",
    "GLOBAL",
    "en",
    48,
    1,
    { url: "https://hnrss.org/newest?q=AI", category: "community", take: 40 },
  ],
  [
    "worldlabs",
    "World Labs",
    "https://www.worldlabs.ai/blog",
    "rss",
    1,
    "primary",
    "GLOBAL",
    "en",
    93,
    0,
    { url: "https://www.worldlabs.ai/blog", take: 20 },
  ],
  [
    "anthropic",
    "Anthropic",
    "https://www.anthropic.com/news",
    "rss",
    1,
    "primary",
    "GLOBAL",
    "en",
    97,
    0,
    { url: "https://www.anthropic.com/news", take: 30 },
  ],
  [
    "priceai",
    "PriceAI",
    "https://priceai.cc",
    "json-api",
    3,
    "resource",
    "CN",
    "zh-CN",
    70,
    0,
    { url: "https://priceai.cc", take: 20 },
  ],
] as const;

const tracks = [
  [
    "tech-evolution",
    "技术演进",
    "从 Scaling、推理、多模态到 Agent 与世界模型的能力主线。",
    "main",
    "technology",
    "#8b5cf6",
    "⌁",
    10,
  ],
  [
    "agi-progress",
    "AGI 进展",
    "能力泛化、自治、可靠性、安全与治理的可验证进展。",
    "main",
    "agi",
    "#f97316",
    "◎",
    20,
  ],
  [
    "investing",
    "投资视角",
    "融资、并购、CapEx、算力资产、估值与竞争结构。",
    "main",
    "investment",
    "#22c55e",
    "↗",
    30,
  ],
  [
    "commercialization",
    "商业化",
    "收入、成本、定价、分发、留存和商业模式。",
    "main",
    "business",
    "#06b6d4",
    "◆",
    40,
  ],
  ["to-c", "To C", "面向个人消费者的产品、订阅与分发。", "branch", "audience", "#ec4899", "C", 50],
  [
    "to-b",
    "To B",
    "企业工作流、数字员工和行业解决方案。",
    "branch",
    "audience",
    "#3b82f6",
    "B",
    60,
  ],
  [
    "to-d",
    "To D",
    "开发者 API、工具链、Agent 平台与开源生态。",
    "branch",
    "audience",
    "#a855f7",
    "D",
    70,
  ],
  ["to-g", "To G", "政府采购、监管、公共服务与主权 AI。", "branch", "audience", "#eab308", "G", 80],
  [
    "china-catch-up",
    "中国追赶",
    "国内角色相对全球基准的跟随、并跑、领先、受限与出海。",
    "main",
    "geography",
    "#ef4444",
    "中",
    90,
  ],
  [
    "model-economics",
    "模型经济学",
    "模型、订阅、API 与算力的单位成本和购买路径。",
    "branch",
    "economics",
    "#14b8a6",
    "¥",
    100,
  ],
] as const;

const actors = [
  [
    "openai",
    "OpenAI",
    "lab",
    "GLOBAL",
    "frontier",
    ["foundation-model", "agent", "consumer"],
    100,
    "https://openai.com",
  ],
  [
    "anthropic",
    "Anthropic",
    "lab",
    "GLOBAL",
    "frontier",
    ["foundation-model", "agent", "enterprise"],
    98,
    "https://anthropic.com",
  ],
  [
    "google",
    "Google DeepMind",
    "lab",
    "GLOBAL",
    "frontier",
    ["foundation-model", "research", "cloud"],
    100,
    "https://deepmind.google",
  ],
  [
    "meta",
    "Meta AI",
    "company",
    "GLOBAL",
    "frontier",
    ["foundation-model", "open-source", "consumer"],
    96,
    "https://ai.meta.com",
  ],
  [
    "microsoft",
    "Microsoft AI",
    "company",
    "GLOBAL",
    "hyperscaler",
    ["cloud", "enterprise", "agent"],
    99,
    "https://www.microsoft.com/ai",
  ],
  [
    "nvidia",
    "NVIDIA",
    "company",
    "GLOBAL",
    "infrastructure",
    ["chip", "infra", "software"],
    100,
    "https://www.nvidia.com",
  ],
  [
    "worldlabs",
    "World Labs",
    "lab",
    "GLOBAL",
    "startup",
    ["world-model", "spatial-intelligence"],
    82,
    "https://www.worldlabs.ai",
  ],
  [
    "alibaba",
    "阿里巴巴 / 通义",
    "company",
    "CN",
    "hyperscaler",
    ["foundation-model", "cloud", "open-source"],
    94,
    "https://tongyi.aliyun.com",
  ],
  [
    "bytedance",
    "字节跳动 / Seed / 豆包",
    "company",
    "CN",
    "hyperscaler",
    ["foundation-model", "consumer", "agent"],
    95,
    "https://www.volcengine.com/product/doubao",
  ],
  [
    "tencent",
    "腾讯 / 混元",
    "company",
    "CN",
    "hyperscaler",
    ["foundation-model", "cloud", "consumer"],
    92,
    "https://hunyuan.tencent.com",
  ],
  [
    "baidu",
    "百度 / 文心",
    "company",
    "CN",
    "hyperscaler",
    ["foundation-model", "cloud", "search"],
    90,
    "https://yiyan.baidu.com",
  ],
  [
    "huawei",
    "华为 / 盘古 / 昇腾",
    "company",
    "CN",
    "hyperscaler",
    ["foundation-model", "chip", "cloud"],
    94,
    "https://www.huaweicloud.com/product/pangu.html",
  ],
  [
    "deepseek",
    "DeepSeek",
    "lab",
    "CN",
    "frontier",
    ["foundation-model", "reasoning", "open-source"],
    98,
    "https://www.deepseek.com",
  ],
  [
    "zhipu",
    "智谱 AI",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "agent", "enterprise"],
    88,
    "https://www.zhipuai.cn",
  ],
  [
    "minimax",
    "MiniMax",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "consumer", "multimodal"],
    88,
    "https://www.minimaxi.com",
  ],
  [
    "moonshot",
    "月之暗面 / Kimi",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "consumer", "agent"],
    89,
    "https://www.moonshot.cn",
  ],
  [
    "stepfun",
    "阶跃星辰",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "multimodal", "consumer"],
    84,
    "https://www.stepfun.com",
  ],
  [
    "baichuan",
    "百川智能",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "healthcare", "enterprise"],
    78,
    "https://www.baichuan-ai.com",
  ],
  [
    "01ai",
    "零一万物",
    "lab",
    "CN",
    "scaleup",
    ["foundation-model", "enterprise", "open-source"],
    78,
    "https://www.lingyiwanwu.com",
  ],
  [
    "modelbest",
    "面壁智能",
    "lab",
    "CN",
    "startup",
    ["on-device", "foundation-model", "open-source"],
    79,
    "https://www.modelbest.cn",
  ],
  [
    "sensetime",
    "商汤日日新",
    "company",
    "CN",
    "scaleup",
    ["foundation-model", "vision", "enterprise"],
    80,
    "https://www.sensetime.com",
  ],
  [
    "manus",
    "Manus",
    "company",
    "CN",
    "startup",
    ["agent", "consumer", "enterprise"],
    84,
    "https://manus.im",
  ],
  [
    "dify",
    "Dify",
    "company",
    "CN",
    "startup",
    ["agent-platform", "open-source", "developer"],
    82,
    "https://dify.ai",
  ],
  [
    "iflytek",
    "科大讯飞",
    "company",
    "CN",
    "large",
    ["foundation-model", "education", "speech"],
    84,
    "https://xinghuo.xfyun.cn",
  ],
  [
    "xiaomi",
    "小米",
    "company",
    "CN",
    "large",
    ["on-device", "consumer", "robotics"],
    78,
    "https://www.mi.com",
  ],
  [
    "kuaishou",
    "快手 / 可灵",
    "company",
    "CN",
    "large",
    ["video-model", "consumer", "creator"],
    87,
    "https://klingai.kuaishou.com",
  ],
  [
    "meituan",
    "美团",
    "company",
    "CN",
    "large",
    ["agent", "robotics", "local-services"],
    80,
    "https://www.meituan.com",
  ],
  [
    "jd",
    "京东",
    "company",
    "CN",
    "large",
    ["enterprise", "retail", "logistics"],
    77,
    "https://www.jd.com",
  ],
  [
    "cambricon",
    "寒武纪",
    "company",
    "CN",
    "infrastructure",
    ["chip", "infra"],
    84,
    "https://www.cambricon.com",
  ],
  [
    "biren",
    "壁仞科技",
    "company",
    "CN",
    "infrastructure",
    ["chip", "infra"],
    76,
    "https://www.birentech.com",
  ],
  [
    "moorethreads",
    "摩尔线程",
    "company",
    "CN",
    "infrastructure",
    ["chip", "infra"],
    78,
    "https://www.mthreads.com",
  ],
  [
    "enflame",
    "燧原科技",
    "company",
    "CN",
    "infrastructure",
    ["chip", "infra"],
    76,
    "https://www.enflame-tech.com",
  ],
] as const;

const resources = [
  [
    "openai-chatgpt",
    "OpenAI",
    "ChatGPT",
    "official-subscription",
    "to-c",
    "GLOBAL",
    "ChatGPT plans",
    "https://chatgpt.com/pricing",
    "https://openai.com/chatgpt/pricing/",
  ],
  [
    "openai-api",
    "OpenAI",
    "OpenAI API",
    "official-api",
    "to-d",
    "GLOBAL",
    "API pricing",
    "https://platform.openai.com",
    "https://openai.com/api/pricing/",
  ],
  [
    "anthropic-api",
    "Anthropic",
    "Claude API",
    "official-api",
    "to-d",
    "GLOBAL",
    "API pricing",
    "https://console.anthropic.com",
    "https://www.anthropic.com/pricing",
  ],
  [
    "google-gemini",
    "Google",
    "Gemini",
    "official-api",
    "to-d",
    "GLOBAL",
    "Gemini API pricing",
    "https://aistudio.google.com",
    "https://ai.google.dev/gemini-api/docs/pricing",
  ],
  [
    "deepseek-api",
    "DeepSeek",
    "DeepSeek API",
    "official-api",
    "to-d",
    "CN",
    "API pricing",
    "https://platform.deepseek.com",
    "https://api-docs.deepseek.com/quick_start/pricing",
  ],
  [
    "qwen-api",
    "Alibaba Cloud",
    "Qwen API",
    "official-api",
    "to-d",
    "CN",
    "DashScope pricing",
    "https://dashscope.console.aliyun.com",
    "https://help.aliyun.com/zh/model-studio/model-pricing",
  ],
  [
    "kimi-api",
    "Moonshot AI",
    "Kimi API",
    "official-api",
    "to-d",
    "CN",
    "API pricing",
    "https://platform.moonshot.cn",
    "https://platform.moonshot.cn/docs/pricing/chat",
  ],
  [
    "zhipu-api",
    "Zhipu AI",
    "GLM API",
    "official-api",
    "to-d",
    "CN",
    "API pricing",
    "https://open.bigmodel.cn",
    "https://open.bigmodel.cn/pricing",
  ],
  [
    "priceai",
    "PriceAI",
    "AI 订阅与 API 比价",
    "external-comparison",
    "all",
    "CN",
    "购买前比价入口",
    "https://priceai.cc",
    "https://github.com/dimthink/PriceAI",
  ],
] as const;

const events = [
  {
    slug: "gpt-5-6-agent-platform-shift",
    title: "GPT-5.6 发布：OpenAI 把模型升级推向长期自主 Agent",
    fact: "OpenAI 发布 GPT-5.6，并同步推出面向跨应用、文件与长期任务的 ChatGPT Work。",
    summary:
      "GPT-5.6 强调单位 token 智能与单位成本性能，ChatGPT Work 则把能力装进可长期驻留项目、跨应用执行的 Agent 产品。两者合起来比单纯 benchmark 提升更值得关注。",
    technical:
      "能力竞争正在从单轮回答转向长时规划、工具使用、状态保持和失败恢复；Agent runtime 的可靠性会比模型峰值分数更快成为瓶颈。",
    industry:
      "OpenAI 正把竞争边界从模型 API 扩展到任务执行平台，直接挤压办公 SaaS、自动化工具和垂直 Agent 的价值空间。",
    future: "观察复杂任务的真实完成率、长任务成本、人工接管频率，以及第三方应用权限治理。",
    business:
      "CEO 应先识别可被目标级指令替代的跨系统流程；投资负责人应重新评估仅靠 UI 包装或单点 workflow 的 Agent 公司。",
    category: "model-release",
    company: "OpenAI",
    keywords: ["GPT-5.6", "Agent", "ChatGPT Work", "长期自治"],
    scores: [96, 92, 98, 96],
    date: "2026-07-09T08:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/gpt-5-6",
    tracks: ["tech-evolution", "agi-progress", "commercialization", "to-b", "to-d"],
    actors: ["openai"],
  },
  {
    slug: "gpt-5-6-microsoft-365-distribution",
    title: "GPT-5.6 进入 Microsoft 365 Copilot：Agent 获得企业级分发",
    fact: "GPT-5.6 成为 Microsoft 365 Copilot 的首选模型，覆盖 Word、Excel、PowerPoint、Chat 和 Cowork。",
    summary:
      "模型能力通过全球最大办公软件分发网络进入真实工作流，竞争重点从谁的模型更强转向谁能占据用户上下文、权限和组织数据。",
    technical: "企业 Agent 的关键不再只是推理，而是权限、数据边界、审计和跨应用执行的一致性。",
    industry:
      "微软把模型升级快速转化为渠道优势，向 Google Workspace、传统 SaaS 和独立 Agent 平台施压。",
    future: "观察席位渗透率、实际任务完成量、Copilot ARPU 和企业续费是否同步提升。",
    business: "To B 创业公司必须证明自己拥有微软难以复制的行业数据、流程闭环或交付能力。",
    category: "commercialization",
    company: "Microsoft / OpenAI",
    keywords: ["Microsoft 365", "Copilot", "企业 Agent", "分发"],
    scores: [97, 88, 96, 94],
    date: "2026-07-09T10:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/gpt-5-6-preferred-model-microsoft-365-copilot",
    tracks: ["commercialization", "investing", "to-b"],
    actors: ["openai", "microsoft"],
  },
  {
    slug: "gpt-live-voice-interface",
    title: "GPT-Live 推进全双工语音：Agent 的交互带宽继续上升",
    fact: "OpenAI 发布新一代语音模型 GPT-Live，并接入 ChatGPT Voice。",
    summary:
      "语音模型把语气、节奏与情绪等副语言信息纳入理解和生成，Agent 从文本工具向持续陪伴和实时协作界面迈进。",
    technical:
      "真正的门槛是低延迟打断、端到端语音推理、情绪一致性和长会话状态，而不只是语音识别准确率。",
    industry: "语音入口会重排助手、客服、教育、陪伴和可穿戴设备的竞争格局。",
    future: "观察端到端延迟、打断恢复、成本、隐私与高噪声环境成功率。",
    business:
      "To C 应优先验证高频陪伴与实时决策场景；To B 应选择可量化节省人工时长的客服和销售流程。",
    category: "multimodal",
    company: "OpenAI",
    keywords: ["GPT-Live", "语音", "多模态", "人机交互"],
    scores: [94, 83, 88, 88],
    date: "2026-07-08T08:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/introducing-gpt-live",
    tracks: ["tech-evolution", "agi-progress", "to-c", "commercialization"],
    actors: ["openai"],
  },
  {
    slug: "swe-bench-pro-signal-noise",
    title: "SWE-Bench Pro 评测反思：编码 Agent 从榜单走向真实任务",
    fact: "OpenAI 发布 SWE-Bench Pro 分析，讨论现行编码评测中的信噪比和能力误判问题。",
    summary:
      "领先实验室开始公开质疑 benchmark 与真实软件工程之间的偏差，说明编码 Agent 评估正从单一通过率走向可复现、可维护和端到端交付。",
    technical:
      "未来评测需要覆盖需求理解、代码库导航、测试有效性、回归风险、长任务恢复和人类接管成本。",
    industry: "榜单优势的营销价值会下降，拥有真实任务集和生产反馈闭环的平台价值上升。",
    future: "观察私有评测集、真实 PR 合并率、回滚率和长周期维护指标是否成为采购标准。",
    business: "采购编码 Agent 时应建立企业自己的黄金任务集，避免用公开 benchmark 直接代替 ROI。",
    category: "research",
    company: "OpenAI",
    keywords: ["SWE-Bench", "编码 Agent", "评测", "可靠性"],
    scores: [96, 68, 84, 82],
    date: "2026-07-08T12:00:00.000Z",
    source: "openai",
    url: "https://openai.com/index/separating-signal-from-noise-coding-evaluations",
    tracks: ["tech-evolution", "agi-progress", "to-d", "to-b"],
    actors: ["openai"],
  },
  {
    slug: "world-model-functional-taxonomy",
    title: "World Labs 建立世界模型分类学：空间智能路线开始系统化",
    fact: "World Labs 发布世界模型功能分类框架，梳理空间智能的层级与能力维度。",
    summary:
      "世界模型从模糊口号走向可讨论的功能框架，为机器人、AR、自动驾驶和物理世界 Agent 提供共同语言。",
    technical: "语言模型之外，物理 Agent 需要持久空间表示、因果预测、可行动模拟和闭环纠错。",
    industry:
      "空间智能可能形成独立于纯语言 Scaling 的新平台层，并带动数据、仿真、传感器和机器人生态投资。",
    future: "观察标准数据集、可行动世界模型、仿真到现实迁移和硬件闭环演示。",
    business: "投资负责人应区分生成 3D 内容与支持决策/行动的世界模型，后者技术壁垒和产业价值更高。",
    category: "research",
    company: "World Labs",
    keywords: ["世界模型", "空间智能", "机器人", "World Labs"],
    scores: [91, 62, 92, 82],
    date: "2026-06-03T08:00:00.000Z",
    source: "worldlabs",
    url: "https://www.worldlabs.ai/blog",
    tracks: ["tech-evolution", "agi-progress", "investing"],
    actors: ["worldlabs"],
  },
] as const;

export async function seedDatabase(db: Kysely<DatabaseSchema>): Promise<void> {
  const repository = new Repository(db);
  const timestamp = isoNow();

  for (const [
    slug,
    name,
    homepage,
    adapter,
    tier,
    role,
    region,
    language,
    authority,
    enabled,
    config,
  ] of sources) {
    await repository.saveSource({
      id: stableId("source", slug),
      slug,
      name,
      homepage_url: homepage,
      adapter,
      tier,
      role,
      region,
      language,
      authority_score: authority,
      enabled,
      config_json: JSON.stringify(config),
      state_json: "{}",
      last_collected_at: null,
      last_success_at: null,
      last_error: null,
    });
  }

  for (const [slug, name, description, kind, perspective, color, icon, order] of tracks) {
    const existing = await db
      .selectFrom("tracks")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    const value = {
      id: stableId("track", slug),
      slug,
      name,
      description,
      kind,
      perspective,
      color,
      icon,
      order_index: order,
      enabled: 1,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (existing)
      await db
        .updateTable("tracks")
        .set({ ...value, id: existing.id })
        .where("id", "=", existing.id)
        .execute();
    else await db.insertInto("tracks").values(value).execute();
  }

  for (const [slug, name, actorType, region, scale, domains, tableScore, website] of actors) {
    const existing = await db
      .selectFrom("actors")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    const value = {
      id: stableId("actor", slug),
      slug,
      name,
      actor_type: actorType,
      region,
      scale,
      domains_json: JSON.stringify(domains),
      table_score: tableScore,
      website_url: website,
      enabled: 1,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (existing)
      await db
        .updateTable("actors")
        .set({ ...value, id: existing.id })
        .where("id", "=", existing.id)
        .execute();
    else await db.insertInto("actors").values(value).execute();
  }

  for (const [
    slug,
    provider,
    model,
    resourceType,
    audience,
    region,
    planName,
    purchaseUrl,
    sourceUrl,
  ] of resources) {
    const existing = await db
      .selectFrom("model_resources")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst();
    const value = {
      id: stableId("resource", slug),
      slug,
      provider,
      model,
      resource_type: resourceType,
      audience,
      region,
      currency: "USD",
      input_price: null,
      output_price: null,
      unit: "See official source",
      plan_name: planName,
      purchase_url: purchaseUrl,
      source_url: sourceUrl,
      external_comparison_url: slug === "priceai" ? null : "https://priceai.cc",
      risk_level: resourceType === "external-comparison" ? "reference" : "official",
      verified_at: "2026-07-11T00:00:00.000Z",
      enabled: 1,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (existing)
      await db
        .updateTable("model_resources")
        .set({ ...value, id: existing.id })
        .where("id", "=", existing.id)
        .execute();
    else await db.insertInto("model_resources").values(value).execute();
  }

  const viewId = stableId("view", "executive-briefing");
  const viewValue = {
    id: viewId,
    slug: "executive-briefing",
    name: "CEO / 投资负责人总览",
    description: "先看战略、资本与商业化，再下钻技术与证据。",
    filters_json: JSON.stringify({ statuses: ["published"], minConfidence: 60 }),
    layout_json: JSON.stringify({
      blocks: ["hero", "track-switcher", "timeline", "china-radar", "resources"],
      density: "comfortable",
      defaultTrack: "tech-evolution",
    }),
    theme_json: JSON.stringify({ theme: "midnight", accent: "#8b5cf6", radius: 20 }),
    is_default: 1,
    status: "published",
    created_at: timestamp,
    updated_at: timestamp,
  };
  const existingView = await db
    .selectFrom("views")
    .select("id")
    .where("slug", "=", viewValue.slug)
    .executeTakeFirst();
  if (existingView)
    await db
      .updateTable("views")
      .set({ ...viewValue, id: existingView.id })
      .where("id", "=", existingView.id)
      .execute();
  else await db.insertInto("views").values(viewValue).execute();

  for (const event of events) await seedEvent(db, repository, event, timestamp);
}

async function seedEvent(
  db: Kysely<DatabaseSchema>,
  repository: Repository,
  event: (typeof events)[number],
  timestamp: string,
) {
  const existing = await db
    .selectFrom("events")
    .select("id")
    .where("slug", "=", event.slug)
    .executeTakeFirst();
  const id = existing?.id ?? stableId("event", event.slug);
  const [confidence, heat, impact, value] = event.scores;
  const eventValue = {
    id,
    slug: event.slug,
    title: event.title,
    fact_summary: event.fact,
    summary: event.summary,
    technical_insight: event.technical,
    industry_insight: event.industry,
    future_outlook: event.future,
    business_value: event.business,
    category: event.category,
    company: event.company,
    keywords_json: JSON.stringify(event.keywords),
    confidence_score: confidence,
    heat_score: heat,
    impact_score: impact,
    value_score: value,
    score_factors_json: JSON.stringify({
      authority: confidence,
      corroboration: 80,
      primaryEvidence: 100,
      uniqueAuthors: 0,
      independentSources: 1,
      platformBreadth: 1,
      regionBreadth: 1,
      velocity: heat,
      freshness: 70,
      crossRegion: false,
    }),
    status: "published",
    featured: value >= 94 ? 1 : 0,
    manual_override: 1,
    happened_at: event.date,
    published_at: event.date,
    created_at: timestamp,
    updated_at: timestamp,
  };
  if (existing)
    await db
      .updateTable("events")
      .set({ ...eventValue, id: existing.id })
      .where("id", "=", existing.id)
      .execute();
  else await db.insertInto("events").values(eventValue).execute();

  const sourceId = stableId("source", event.source);
  const signal = await repository.insertSignal(sourceId, {
    externalId: event.slug,
    url: event.url,
    title: event.title,
    summary: event.fact,
    language: "zh-CN",
    publishedAt: event.date,
    category: event.category,
    tags: [...event.keywords],
    metrics: {
      independentSources: 1,
      platforms: ["official"],
      regions: [event.source === "worldlabs" ? "GLOBAL" : "US"],
    },
    rawMeta: { seeded: true },
  });
  const signalId =
    signal?.id ??
    (
      await db
        .selectFrom("signals")
        .select("id")
        .where("external_id", "=", event.slug)
        .executeTakeFirstOrThrow()
    ).id;
  await repository.attachSignal(id, signalId, "primary", 100);

  for (const [index, trackSlug] of event.tracks.entries()) {
    const track = await db
      .selectFrom("tracks")
      .select("id")
      .where("slug", "=", trackSlug)
      .executeTakeFirstOrThrow();
    const exists = await db
      .selectFrom("event_tracks")
      .select("event_id")
      .where("event_id", "=", id)
      .where("track_id", "=", track.id)
      .executeTakeFirst();
    if (!exists)
      await db
        .insertInto("event_tracks")
        .values({
          event_id: id,
          track_id: track.id,
          node_role: index === 0 ? "milestone" : "supporting",
          narrative: event.industry,
          stage: "inflection",
          order_index: index * 10,
          created_at: timestamp,
        })
        .execute();
  }
  for (const actorSlug of event.actors) {
    const actor = await db
      .selectFrom("actors")
      .select("id")
      .where("slug", "=", actorSlug)
      .executeTakeFirstOrThrow();
    const exists = await db
      .selectFrom("event_actors")
      .select("event_id")
      .where("event_id", "=", id)
      .where("actor_id", "=", actor.id)
      .executeTakeFirst();
    if (!exists)
      await db
        .insertInto("event_actors")
        .values({
          event_id: id,
          actor_id: actor.id,
          actor_role: "owner",
          progress_stage: actorSlug === "openai" ? "leading" : "active",
          relevance_score: 100,
          created_at: timestamp,
        })
        .execute();
  }
}
