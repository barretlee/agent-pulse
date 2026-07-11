# 研究记录

## 现有实现审计

- 当前目录不是 Git 仓库。
- `scripts/collect.py` 只支持 OpenAI RSS 和 4 个 HTML 正则分支。
- HTML 解析依赖具体 class/正则，且 Google/World Labs 等条目可能把抓取时间误当发布时间。
- `data/entries.json` 只有 14 条人工内容，没有 schema、来源评分、热度指标或证据关系。
- `index.html` 是 720px 单列时间轴，卡片不可展开，无搜索、主题切换和管理能力。
- `serve.sh` 依赖 Python http.server。

## AI HOT（已验证）

站点公开信息显示：

- Next.js 应用，提供 RSS、REST API、OpenAPI、日报、分类 feed。
- 声明聚合 X、微信公众号、RSS、官方博客等数百个信源，并由 LLM 摘要、打分、精选和编排。
- `/api/public/items` 支持 selected/all、分类、时间、搜索、cursor、minimal/default 字段。
- 推荐先轮询 `/api/public/fingerprint`，变化后再拉 items，并支持 ETag/304。
- `/api/public/hot-topics` 是独立信源数加时间衰减的簇级热度，不等同于最新排序。
- selected 会去掉同事件 secondary/related、低相关和未评分内容。
- API 有 60 req/min 配额，要求可识别的非浏览器 User-Agent。

结论：AI HOT 适合作为高质量中文发现源和聚类参考。正式适配器应遵守 fingerprint -> items、ETag、低频串行和明确 UA；其条目仍需回链一手来源。

## HuggingNews（已验证）

About 页公开说明：

- 主要跟踪 X 上的 AI 账号、实验室、公司、项目、记者和研究者。
- 对多来源内容做候选聚类，发现新事件后研究并写短篇，偏好一手来源。
- 页面展示 source role、原帖、引用和原始链接。
- 首页 SSR 数据暴露 `tweetCount`、`authorCount`、`storyScore`、事件更新时间关系和 writer model。
- 技术栈为 SvelteKit + Convex；当前 About 明确写着 MCP/API/RSS “coming”。
- robots 允许 search/reference，禁止 AI training；不得做全文镜像或高频盗采。

结论：HuggingNews 的强项是 X 传播聚类和独立作者数，是海外热度参考，不是可依赖的正式 API。第一阶段仅低频读取公开 SSR 事件元数据和原始链接；适配器默认关闭，并保留随时切换正式 API/RSS 的接口。

## 产品借鉴与不照搬

- 借鉴 AI HOT：低成本指纹轮询、精选/全量分离、事件去重、日报收敛。
- 借鉴 HuggingNews：独立作者数、事件更新链、一手来源角色、紧凑客观写作。
- 不照搬：两者仍偏“发生了什么”。Agent Pulse 增加技术洞察、行业判断、未来观察和业务动作。
- 不照搬：单一 X 热度无法满足中国市场判断；必须加入中文传播域和地区宽度。

## PriceAI（已验证）

- 公开项目为 `dimthink/PriceAI`，站点为 `priceai.cc`。
- 提供官方订阅地区价、200+ 卡网订阅、官方 API、中转 API 和模型检测五类购买前决策信息。
- 强调官方基准、第三方低价、库存/新鲜度、充值倍率、模型倍率、综合倍率和风险边界不能混为一谈。
- DATA_LICENSE 明确禁止批量复制生产价格、渠道列表、价格快照、库存和运营数据来运行竞争数据集。

接入结论：

1. Agent Pulse 不镜像 PriceAI 的生产数据，也不高频抓取。
2. 公开页提供 PriceAI 的外部购买前比价入口与明确归属。
3. Agent Pulse 的官方价格基准独立从模型厂商官方页面采集并保留证据。
4. 数据模型预留授权适配器；获得书面授权或正式开放 API 后再启用。
5. 模型获取资源与行业事件关联，例如降价、免费额度、地区上线和中转风险变化可成为商业化主线节点。

## 高价值来源地图

### 海外一手源

- Frontier labs：OpenAI、Anthropic、Google DeepMind、Meta AI、Microsoft Research、xAI、Mistral、Cohere。
- 模型与开源：Hugging Face blog/model feeds、GitHub releases、vLLM、llama.cpp、Ollama、LangChain/LangGraph。
- 论文：arXiv cs.AI/cs.CL/cs.LG、实验室 publication pages、Papers with Code/Hugging Face papers（发现）。
- 芯片与基础设施：NVIDIA、AMD、Google Cloud、AWS、Azure 官方公告与 earnings/filings。
- 政策：White House、EU Commission、NIST、UK AISI、CAISI、各监管机构原文。

### 海外洞察源

- 研究/评测：Stanford HAI、Epoch AI、METR、Artificial Analysis、LMSYS/Chatbot Arena。
- 投资/产业：a16z、Sequoia、Bessemer、NFX、Menlo Ventures、ARK/industry research。
- 技术与人物：Andrej Karpathy、Yann LeCun、Demis Hassabis、Dario Amodei、Sam Altman、Fei-Fei Li、Jeff Dean、Lilian Weng、Simon Willison、Chip Huyen、Ethan Mollick。

### 中国一手源

- 模型厂商：阿里通义、字节豆包/Seed、腾讯混元、百度文心、DeepSeek、智谱、MiniMax、月之暗面、阶跃星辰、零一万物、百川、面壁智能。
- 开源与论文：ModelScope、OpenCompass、GitHub/Gitee release、arXiv 作者/机构检索、公司微信公众号和技术博客。
- 大厂与资本：公司公告、港交所/上交所/深交所披露、国家网信办/工信部政策、头部基金研究与被投企业公告。

国内角色初始目录不只收头部模型厂商，还覆盖：

- 云与基础设施：阿里云、腾讯云、火山引擎、百度智能云、华为云、天翼云、移动云、联通云；
- 模型创业公司：DeepSeek、智谱、MiniMax、月之暗面、阶跃星辰、百川、零一万物、面壁智能、商汤日日新；
- Agent/开发者工具：Manus、扣子、Dify、FastGPT、RAGFlow、ModelScope/OpenCompass 生态；
- 芯片与算力：华为昇腾、寒武纪、壁仞、摩尔线程、燧原、沐曦及头部算力运营商；
- 应用与分发：字节、腾讯、阿里、百度、快手、美团、京东、小米、OPPO、vivo、荣耀、科大讯飞、金山办公；
- 投资与研究：大厂战投、头部 VC/CVC、研究机构与政策机构。

目录是可配置起点，不把“名单存在”当成“已经上牌桌”；上牌桌状态必须由模型能力、用户/收入、资本、算力、生态或政策证据支撑。

### 中文洞察与扩散

- 专业媒体/社区：机器之心、量子位、新智元、InfoQ、36氪、极客公园、知乎、V2EX、Linux.do。
- 社交热度：微博话题/热榜、微信公众号爆文、知乎问题互动、B 站技术视频、即刻/小红书只作趋势补充。
- 中文作者必须维护白名单与所属机构，避免营销号矩阵造成虚假独立来源数。

## 获取优先级

1. 官方 API / RSS / Atom / GitHub releases。
2. 官方公开 JSON 或稳定 HTML metadata。
3. 聚合器公开 API（只作发现）。
4. 符合 robots、低频且仅取元数据的 HTML。
5. 需要登录、cookie 或不稳定逆向接口默认禁用，等待官方接入。

## 仍需后续验证

- 各中文公众号/微博源的合规、稳定 API 与成本。
- HuggingNews 正式 API/RSS 发布后的适配器替换。
- 跨中英文事件的实体对齐和转载矩阵识别。
- 实际运行 2-4 周后再校准热点阈值，避免用拍脑袋常数长期排序。
