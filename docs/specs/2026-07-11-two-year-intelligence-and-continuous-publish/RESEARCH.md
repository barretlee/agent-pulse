# 两年行业情报回溯研究方案

- 研究窗口：2024-07-01 至 2026-07-11
- 状态：Research plan；尚未完成历史采集和事件审核
- 原则：先建立 archive/coverage，再回填；先回源事实，再写阶段结论

## 1. 研究问题

本轮不是回答“两年内发生了哪些新闻”，而是回答：

1. 基础模型能力从何种瓶颈迁移到何种瓶颈？
2. AGI 讨论中哪些进展有独立复现，哪些仍是演示或叙事？
3. 资本从模型、算力、工具到应用如何迁移，背后验证了什么？
4. 商业化从订阅/API 走向企业工作流和 Agent 时，成本与分发如何变化？
5. 产品入口从对话框向搜索、编码、办公、语音、浏览器和行动执行如何演变？
6. To C/B/D/G 的成熟节奏和证据口径有何不同？
7. 中国厂商在哪些维度跟随、收窄、并跑、领先、受限或出海？
8. 哪些当时热门判断后来被验证，哪些被反证？

## 2. 研究单位

```text
Source archive -> Document -> Observation -> Claim/Evidence -> Event
                                                         |
                                      Track node / Phase / Synthesis
```

- Source archive 是获取边界，不等于事实；
- Document 是独立材料；
- Observation 是传播/引用记录；
- Claim 是最小可验证陈述；
- Event 是历史时间轴节点；
- Phase/Synthesis 是基于审核节点的认知产物。

## 3. 来源地图

以下入口用于制定 archive manifest。实际接入前需复核 API、robots、许可、分页、时间语义和可用区间。

### 3.1 全球模型与研究一手源

- OpenAI News/Research：<https://openai.com/news/>
- Anthropic News/Research：<https://www.anthropic.com/news>
- Google DeepMind Blog/Publications：<https://deepmind.google/discover/blog/>
- Google AI Developers/Cloud release notes：<https://ai.google.dev/>、<https://cloud.google.com/release-notes>
- Meta AI：<https://ai.meta.com/blog/>
- Microsoft Research/AI：<https://www.microsoft.com/en-us/research/blog/>
- xAI、Mistral、Cohere 等公司官方发布页；
- Hugging Face Blog/Papers/Models：<https://huggingface.co/blog>
- arXiv API 与分类/机构检索：<https://info.arxiv.org/help/api/index.html>
- 官方 GitHub organization、release、tag 和模型卡。

优先恢复：发布公告、system/model card、技术报告、论文、评测说明、价格页和 release note。公司博客只证明其自身声明，能力结论需独立评测/复现。

### 3.2 全球算力、云与供应链

- NVIDIA、AMD、Intel 官方 newsroom、developer blog、财报/IR；
- AWS、Azure、Google Cloud 官方发布与价格/配额文档；
- 芯片、数据中心、能源与云 CapEx 使用公司财报、SEC filing 和官方 earnings material；
- SEC EDGAR：<https://www.sec.gov/edgar/search/>

避免仅用二级媒体推算 CapEx、订单和收入。关键财务数字保留 filing period、currency、GAAP/non-GAAP 和公司口径。

### 3.3 中国模型、云、芯片与产品

- 阿里通义/阿里云、字节 Seed/豆包/火山引擎、腾讯混元/腾讯云、百度文心/智能云、华为盘古/昇腾/华为云；
- DeepSeek、智谱、MiniMax、月之暗面、阶跃星辰、百川、零一万物、面壁、商汤；
- ModelScope、OpenCompass、官方 GitHub/Gitee organization 和技术报告；
- 寒武纪、壁仞、摩尔线程、燧原、沐曦及其他算力角色的官网、招股书、财报和交易所披露；
- 快手/可灵、科大讯飞、金山办公、小米、OPPO、vivo、荣耀、美团、京东等产品/IR/开发者入口。

微信公众号文章可作为官方材料，但应保存账号身份、原文链接、发布时间和可访问状态；聚合转存不能替代官方身份确认。

### 3.4 资本与交易

- 公司/投资机构官方融资或并购公告；
- SEC、HKEX、上交所、深交所、北交所等原始披露；
- 投资机构 research/portfolio announcement；
- 权威商业媒体作为独立验证和背景；
- 商业数据库若无授权只用于人工检索线索，不复制数据集。

中国交易所入口：

- HKEXnews：<https://www1.hkexnews.hk/>
- 上交所：<https://www.sse.com.cn/>
- 深交所：<https://www.szse.cn/>

融资事件区分 announcement、签约、交割、监管批准和媒体传闻，金额/估值不得混用。

### 3.5 政策与 To G

- 中国国家网信办、工信部、国务院及地方政策原文；
- 美国 White House、NIST、联邦机构和国会原文；
- 欧盟委员会、EU AI Act 官方文本和执行时间表；
- UK AISI、国际标准/安全机构公开材料；
- 政府采购和公共服务使用官方招标/中标/项目文件。

政策事件区分提案、通过、生效、实施细则、执法和司法结果。

### 3.6 产品、价格与开发者

- 产品 changelog、release notes、帮助中心、官方定价/API 文档；
- App Store/Google Play 官方页面可补地区与版本信息，但需记录地区和抓取时间；
- GitHub release、package registry、官方 SDK 文档；
- 官方 status/incident report 用于可靠性事件；
- PriceAI 只作为明确归属的外部购买前参考，不复制其生产价格、渠道、库存、freshness 或历史数据。

历史价格必须使用厂商官方归档或当时可信存档；当前价格页不能证明过去价格。

### 3.7 专业验证、专家与社区

- Stanford HAI、Epoch AI、METR、Artificial Analysis、LMSYS/Arena 等研究和评测；
- a16z、Sequoia、Bessemer、Menlo 等投资研究；
- 学者、研究者、CXO、工程师和记者的公开文章/帖子；
- Hacker News、Reddit、X、微博、知乎、B 站等只用于传播、争议和开发者反馈。

专家观点不单独确认重大事实；同机构账号和媒体矩阵需要 identity group 去重。

## 4. 聚合站的历史价值与限制

### AI HOT

- 适合发现中文近期候选、分类、精选和原始链接；
- items API 的近期窗口不能覆盖完整两年；daily archive 的实际可用深度需按公开契约核验；
- 只能创建 discovery/heat Observation，事实必须回原始 URL；
- 不用其当前 score 反推 2024/2025 热度。

### HuggingNews

- 适合发现海外/X 传播簇、关键账号和原始帖子；
- 截至 2026-07-11 没有稳定公开 API/RSS contract，HTML 历史深度和结构不应被当作两年档案保证；
- 仅低频 metadata/shadow 使用，原帖/公告/论文才是事实证据。

### 搜索与 Web Archive

- 搜索结果只用于发现 URL，snippet 不能成为公开证据；
- 合法公共 Web Archive 可恢复消失页面，但必须同时保存 original URL、archive provider、capture time 和 availability；
- archive 时间证明“某时已存在”，不必然等于事件发生时间。

## 5. Archive 可用性分级

| 等级 | 获取方式 | 两年回溯策略 |
| --- | --- | --- |
| A | 官方 API/archive/filing/release | 自动 backfill + contract |
| B | 官方分页/sitemap/稳定 HTML metadata | 低频自动 + drift fixture |
| C | 官方内容存在但索引弱/仅手工入口 | 人工 manifest + assisted import |
| D | 聚合/媒体可发现，原文可能缺失 | discovery only + 回源任务 |
| R | 登录、付费、WAF、许可受限 | restricted，不自动采集 |
| X | 已消失且无可信存档 | evidence gap |

Catalog source 数量不能代替 A/B archive 实际覆盖。

## 6. 时间窗口与研究波次

### Wave 1：2024-07 至 2024-12

研究重点：基线状态、模型能力/价格、开源与闭源路线、Agent/编码/多模态的成熟度，以及这一阶段形成的资本和政策假设。

### Wave 2：2025-01 至 2025-06

研究重点：能力/成本变化是否扩散到产品，开发者和企业采用是否出现可验证拐点，中国角色相对基准是否收窄。

### Wave 3：2025-07 至 2025-12

研究重点：Agent runtime、分发入口、企业工作流、硬件/具身和资本重估之间的传导。

### Wave 4：2026-01 至 2026-06

研究重点：长期任务、可靠性、产品化、采购和单位经济，以及监管/主权 AI 的落地证据。

### Wave 5：2026-07-01 至 2026-07-11

研究重点：与实时 lane 对齐，验证历史基线能否解释当前热点和下一阶段观察。

这些是研究问题，不预设结论。每个 wave 完成后才能冻结实际阶段边界。

## 7. 主线研究模板

每条主线、每个季度回答：

- 本季度的起点假设是什么？
- 哪些原始事实改变了假设？
- 有哪些相互竞争或矛盾的证据？
- 哪个节点可能是转折，为什么？
- 技术如何传导到产品、资本和商业化？
- 国内外角色的可比维度和时间差是什么？
- 当时哪些问题仍不可知？
- 后来如何验证或反证？

## 8. 事件入选 Rubric

每个候选按 0–5 评估：

- evidence quality；
- technical/market shift；
- sustained downstream effects；
- cross-track relevance；
- China/global comparability；
- decision value；
- historical uniqueness。

Rubric 只帮助排序 review，不替代事实门禁。低热度但高结构影响的事件可以入选；高热度但无持续影响的事件可以降为背景 Observation。

## 9. 历史热度研究

可用证据：

- 当时公开互动数字及其 capture time；
- 独立作者/媒体/社区响应；
- GitHub star/fork/release、论文引用等可解释时间序列；
- 多地区、多语言传播和持续天数；
- 产品榜单/下载/用户数字仅在来源口径清晰时使用。

不可用做法：

- 用今天累计数字代表当时热度；
- 把搜索结果数量当独立来源；
- 把同媒体矩阵转载当跨圈传播；
- 把聚合器当前 score 当历史 measurement；
- 缺数据时用固定中位数补齐。

## 10. 中国追赶研究方法

比较必须在同一维度和相近窗口进行：

- 模型能力：相同/可比评测、独立复现、已知 contamination；
- 成本：同单位、上下文/缓存/批处理口径和核验时间；
- 产品：同类任务、用户、地区、分发和留存证据；
- 开源：许可、权重、代码、训练/部署可复现和生态；
- 商业：收入/用户/合同/采购口径；
- 芯片：制程不是唯一指标，还看软件栈、供给、部署和 TCO；
- 政策：比较生效和执行，不只比较文本发布日期。

不能用单个总分给公司永久排名。每个 progress stage 必须绑定 Event、benchmark、dimension、asOf 和 evidence。

## 11. 偏差与风险

### 生存者偏差

今天仍可访问的公司和项目更容易被收录。使用当时榜单/目录只作候选，并主动记录消失、失败和被收购角色。

### 后见之明

把 asOf 内容和 retrospective validation 分开；阶段总结保留旧版本，不用后来结果改写当时判断。

### Archive 偏差

页面被更新、删除或重新定向；保存 capture time、content hash、archive provider 和 time precision。

### 语言与媒体偏差

英文/X 更容易获得结构化历史，中文微信/社交历史更容易缺档。coverage matrix 必须公开这种不对称，不把缺数据解释为没发生。

### 宣传与评测偏差

厂商自测、榜单污染、选择性披露和 benchmark overfitting 必须有 source role 和独立验证标签。

### 数量驱动

不得用“每月固定 N 条”迫使编辑发布低价值事件。稀疏季度可以有 evidence gap。

## 12. 研究产物

每个 wave 交付：

- source/archive coverage matrix；
- reviewed Event 与 evidence pack；
- merge/split/identity golden fixtures；
- 10 条主线的季度 Phase；
- 中国/全球 benchmark 对照；
- evidence gap、许可风险和后续补洞；
- candidate snapshot 与 diff；
- 质量报告和下一 wave 规则修订。

最终交付：

- 2024-07 至 2026-07 两年可回源主线；
- 月度 Pulse、季度 Phase、年度 Arc、两年 Synthesis；
- 可复现回填和持续发布机制；
- 可供后续 Claim/Evidence 图谱和预测校准使用的历史基线。
