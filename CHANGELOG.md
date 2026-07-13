# Changelog

所有值得用户感知的 Agent Pulse 变化都会记录在这里。版本遵循语义化版本，能力状态分为 planned、experimental 和 operational；只有拥有代码、测试或运行证据的能力才会进入 release。

## [Unreleased]

### 产品体验重构

- 首页从模块目录重构为“30 秒知道变化、3 分钟理解影响、10 分钟形成判断”的完整消费路径，主导航改为今日必读、趋势判断、事件脉络和行动参考。
- Event 继续作为唯一事实节点；同一事件的首次出现、官方更新、外部讨论和行业反馈按时间聚合，事件列表默认按最近进展倒序。
- 事件详情统一回答发生了什么、改变了什么、为什么重要、影响谁、当前判断和下一观察，减少 Timeline、Evidence、Decision Tools 等系统语言。
- 来源页新增 Claude Code、OpenAI/Codex、DeepMind、Cursor、Windsurf、Lovable、Vercel AI、Cloudflare AI、MCP、A2A、Browser Use、AI Coding、AI Infra 和 AI Agent 覆盖体检，明确区分目录收录、最近健康与有效覆盖。
- 新增 Lovable Changelog RSS 与 A2A Protocol Releases 两个 shadow-first 第一方来源，并提供成功 fixture、失败契约复用与真实 endpoint 验证。

### 事件脉络与研究深度

- 事件脉络改为按年、月组织的倒序列表；证据详情统一通过桌面右侧、移动端底部抽屉打开，并支持可复制 URL、Esc、遮罩关闭和焦点回退。
- 顶部 GitHub 入口改为通用的 Star 分段组件，静态构建优先使用 24 小时内元数据，否则从 GitHub 官方仓库 API 获取真实 Star 数量。
- 修复研究来源长期停在 deferred 的事件性门槛：具有明确方法、评测对象和决策相关性的论文可进入 review，普通论文列表和短摘要仍保持隔离。
- 研究事件新增方法、行业影响和后续验证深度门禁；首页增加“本周值得读的技术论文”，事件页明确标记预印本与独立复现边界。
- 首批补入长上下文难度、多智能体协作、合成 Persona、多模态盲区、推理泄密和因果数据 Agent 六个研究事件，均回链 arXiv 原始页面。
- 论文展示改为“时间轴完整可见、首页高质量精选”双层门槛；研究筛选覆盖全部公开论文，同日 4 篇以上聚合为可展开的论文日报，研究候选摘要与分析深度门槛适度下调。
- 事件脉络标题缩短为“一个事件，一条完整脉络”，通过响应式字号在桌面与 390px 窄屏保持单行。
- 证据抽屉升级为全站按需组件：首页、趋势、研究、事件脉络、相关事件和星探入口均可原地打开；移除 Timeline 中 50 份重复详情预渲染，并修复空月份标题残留。

### 自主质量运营

- Web Scraper 在 HTML 卡片缺少可信日期时优先使用页面声明的 RSS/Atom；四个 arXiv 分类源改用官方 export Atom 查询，逐源复验均返回 50 条健康结果。
- 来源审计后自动协调生命周期：连续 2 次异常的生产源降级，连续 5 次失败的来源隔离，隔离源连续 3 次健康后回到 shadow；激活统一要求 20 次健康检查和 7 天观察。
- 来源雷达自动匹配 14 条已有一手源，并把 27 条没有一手 URL 的纯聚合线索归类为“身份信息不足”，真实待判定由 50 降至 9。
- 星探生成器改为越过冷却事件继续扫描完整候选池，并按历史数量轮转机会类型；新建议只进入 inbox，不绕过公开门禁。
- 后台来源按钮新增统一 readiness、中文阻塞原因、重复提交保护和操作后刷新；启用、隔离、单源拉取和观察模式使用同一服务端判定。
- 移除自动公开 Event、自动公开 Scout 和自动合并事件；自动化只准备审核队列并处理可逆治理动作。
- GitHub Actions 拆分为 CI、来源审计与协调、数据刷新、健康监控四条闭环，提供串行写入、最小权限、质量证据 artifact 和单一 incident issue。
- 2026-07-13 00:27 UTC 的真实审计快照为 260 个来源：139 healthy、24 degraded、54 failed、43 skipped；107 个来源处于隔离观察。评测如实保留原始加权 57 / 校准总分 50 与 80 分目标，不伪造 7 天观察或用户结果反馈。

### 项目传播与发布治理

- 重写中英文 README 的首屏定位、能力说明与参与入口，让项目价值可直接引用，并清理、复验仓库内外链接。
- 仓库 Changelog 与网站 Changelog 建立双写门禁：开发中变化在前台明确标记，不再把新能力追加到历史发布版本。
- 来源审计每次更新后校验健康摘要 Issue 的开启状态、marker 与审计时间；系统监控持续检查审计成功记录和 Issue 新鲜度。
- 发布流程要求 `npm run check`、静态构建、CI、Pages 和线上 HTTP/内容验证全部通过，才可宣称发布完成。

## [0.6.0] - 2026-07-12

### 决策情报体验

- 将 Today 判断提升到首页首屏，把“别追每条新闻。看清变化的方向。”移到页面末尾；首页只承担判断入口与独立页导流。
- 六条战略主线改为总览与六个详情页，分别呈现阶段、证据累积、角色视角、中国与全球位置及证据缺口。
- Timeline 成为独立证据工作台，支持主线、一手证据和关键词筛选；44 个公开事件均有可分享、可索引的永久详情页。
- 星探、角色雷达、模型获取、系统水位成为四个独立决策工具页；Changelog 以版本能力和用户可感知变化呈现。
- 静态导出覆盖 60 个内容路由并提供独立 404；三套主题、移动底部导航、本地图标和交互预览继续保持纯静态交付。

### 来源治理与持续更新

- 新增结构化 Source Proposal Issue Form、无网络静态校验、维护者权限门禁和 disabled draft PR 导入；Issue 内容不能设置 adapter、评分、生命周期或启用状态。
- Source Audit 与 Data Refresh 恢复并回写同一仓库快照，使用共享并发锁串行写入，避免检查历史和数据提交互相覆盖。
- Source Audit 每轮幂等维护单一健康摘要 Issue，只暴露聚合指标和有限异常 slug；完整报告继续留在版本化数据文件。
- Pages 构建时读取公开 GitHub 元数据并静态写入 Stars、Forks 和 Open Issues；无元数据时使用诚实降级文案。

### 国际化、版权与可信边界

- GitHub 默认首页改为完整英文 README，并提供对等的 `README-zh-cn.md`；补齐贡献来源、行为准则、引用和仓库元数据。
- 快照中的 Signal 与 Discovery 正文改为最多 320 字符的摘录，继续保留 canonical URL、发布者和证据追溯关系。
- 新增代码许可与第三方内容分离说明、纠错/下架入口、Lucide 图标许可及第三方通知；站点不声称拥有来源内容版权。

## [0.5.1] - 2026-07-12

### Fixed

- 仓库快照新增来源检查、逐源最新运行、公开星探及证据关联，恢复来源成功/失败计数和最近成功/验证时间。
- 修复 GitHub Pages 从快照恢复后评测由 30 漂移到 15、公开星探由 4 条退化到 1 条的问题；fresh database 验证现在保持 score 30、raw 42、证据覆盖 20% 和 4 条星探。
- 所有新增快照字段使用公开 allowlist；不保存 source check sample、原始 payload、job 细节、凭证或代理地址。

## [0.5.0] - 2026-07-12

### 数据源恢复与观测

- 新增 append-only `source_checks`，逐源记录访问、抓取、解析、schema、数量、最新时间、重复率、质量、错误、修复建议、代理使用和保留决策。
- `sources:audit` 对全部目录与运行态来源执行非破坏性并发检查；probe 不写 Signal、不重置来源运行态，也不能直接激活来源。
- 第四轮真实复测达到：68 healthy、28 degraded、56 failed、43 policy/manual skipped；185 个来源可访问、163 个完成抓取、77 个产出合规内容。
- 第五轮在正式运行数据库复测 196/196 个来源（包含 1 个保留的 retired 历史来源）：68 healthy、28 degraded、56 failed、44 skipped，186 个可访问、164 个完成抓取、77 个产出合规内容；管理台检查覆盖由 65/196 修复为 196/196。
- 最终扩张到 258 个目录源和 259 个运行行；全量实测 131 healthy、120 个严格有效源、104 个严格实时有效源，63 个新增第一方 GitHub Release Atom 源全部通过真实检查。
- 环境代理只在 network/timeout 后回退，遵守 `NO_PROXY`；52 个来源实际使用代理，31 个恢复为 healthy。403、404、安全和平台策略错误不会通过代理绕过。
- 修复 Qwen 官方 RSS、MLCommons 官方 RSS、LlamaIndex GitHub Releases；Menlo 从 0 条失败提升为 12 条有效内容的 partial contract。
- 无稳定公开接口的 a16z、Sequoia、Bessemer、NFX、White House OSTP 与 TLDR 明确降为 manual，而非伪装成自动成功。

### 事实归属、质量与事件收敛

- 聚合器继续只写 `source_discoveries`；显式清理 48 条未挂载的历史聚合器 Signal，已挂载证据永远保留待审。
- 来源发现优先消费聚合器回链的一手 URL，过滤聚合域、共享平台、已有目录、私网和凭证 URL；默认只生成 proposal，显式保存也只能成为 disabled draft。
- collect 接入质量门禁、域名限速、缓存、URL/日期/阻断页校验；异常空结果和 contract drift 可隔离单源，不阻塞批次。
- 新增 Signal eventability 与 reversible triage：普通媒体评论、论文 firehose 和社区热帖先进入 deferred 数据池，只有明确事件或能补强既有事件时才进入 Timeline。
- 104 源真实采集取得 1,152 条、创建 977 条观察 Signal，随后全部以 `shadow_observation` 进入隔离分诊；公开 Event 仍为 44 个，未被 release firehose 冲垮。
- 两轮真实收敛把 485 个事件、441 个占位 review 收敛为 90 个事件、46 个 review；533 条信号保留为 deferred，原始 Signal 未删除，backlog 降为 0。
- 新增事件合并候选、模型 family/facet 分组、显式人工合并与审计记录；GPT-5.6 被拆分为发布、能力、分发三类候选，避免粗暴合并。
- 发布门禁区分 primary/multi-source evidence、占位内容、实体/分类/关键词/主线、置信度和无证据高热度。

### 管理台与持续进化

- Control Room 新增来源检查、真实健康覆盖、Signal→Event→Ready→Published 漏斗、阻断原因、事件证据详情、合并候选和安全清理入口。
- `evolve` 默认单轮且安全：不会自动激活、发布、保存候选或导出；显式参数可运行有界循环、静态化和 draft candidate 保存。
- 每轮写入原子 checkpoint、独立 iteration report 与 `latest.json`，支持 SIGINT/SIGTERM 在阶段边界退出。
- 连续运行超过 5 小时并完成 24 轮长期进化；最终复跑 104 源无错误、增量 6 条全部隔离，checkpoint 为 completed 且不包含本机绝对路径。
- 增加未授权历史激活审计；累计 38 个不满足 20 次健康检查和 7 天观察窗的旧激活已回到 shadow，Signal 数据保持不变。
- 新增 E3 隔离观察模式：99 个合格 shadow 源可持续供给观察池，但在晋级 E4 前不能进入公开事实；失败会自动退出观察。
- 新增每日三轮 source audit GitHub Action；约 7 天可自然积累 20 次检查，报告只提交公开诊断，不包含数据库、代理地址、凭证或原始 payload。

### 评测重标定

- 修复 69 分虚高：目录预填质量分、重复 SourceRun、人工 confidence/value 自评分、洞察字段完整度和 Scout 编辑状态不再被当作真实效果。
- 来源覆盖改为以最新逐源检查去重；100 个 `healthy` 来源是有效覆盖目标，catalog、draft、manual 和未检查新增候选不算有效来源。
- `insufficient_data` 不再从总分中剔除后重新归一化，而是进入加权总分并硬封顶 45；置信度、价值、实时性和行动效果使用 42/35/30/20 的更严上限。
- 总分新增充分证据覆盖折扣；第一版检查点从旧口径 69 分回落到 27 分。完成来源扩张后，最终为 30 分（维度加权 42，充分证据覆盖 20%）：131 个单轮 healthy 和 99 个 observing 不等于生产覆盖，来源维度只记录 4 个 active 且 healthy 的 E4 样本。
- 管理台评测卡展示 raw score、校准分、分数上限、样本/目标与逐项惩罚，不再只展示一个缺少解释的漂亮分数。

### 公开体验

- 首页重构为“30 秒判断 → 六条主线 → 证据时间轴 → 决策工具”，减少模块堆叠和裸数据暴露。
- Timeline 改为桌面左右双栏常驻预览、移动端底部详情；搜索、主线和证据筛选共享同一阅读流。
- 默认“证据较强”只展示含一手来源的事件；多源二手内容明确标记待确认，不再冒充强证据。
- 事实、系统分析、决策建议和未来观察分区呈现；外部文本解码后继续通过 `textContent` 安全渲染。

### 工程与测试

- 新增 `github-releases`、`web-scraper`、`generic-api`、cache、rate limiter、monitor、strategy、funnel、readiness、provenance 与 review-noise 模块。
- seed 刷新目录 metadata 时不再覆盖 lifecycle、enabled、cursor、成功/失败和运行状态。
- 所有新增清理动作默认 preview，并要求显式 `--confirm`；SQLite 操作前保留本地 ignored backup。
- 完成超过 5 小时的连续进化运行、桌面与 390px 浏览器验收以及最终回归；发布 v0.5.0。

## [0.4.0] - 2026-07-11

### Added

- GitHub Actions 定时数据刷新：每 6 小时恢复仓库快照、采集、聚类、写入 JSON；有实质变化才提交并触发 Pages。
- 可审计的 `data/snapshot/v1.json`，保存来源运行状态、Signal、Discovery、Event 和证据关联；SQLite 不进入 Git。
- 2024-07 至 2026-07 两年行业基线：新增 30 个一手来源关键节点，与近期 6 个节点共同组成 36 个公开 Event。
- 5 个行业发展阶段，以及技术、AGI、商业化、投资、中国追赶、模型经济学 6 条高层主线总结。
- `narratives.json` 静态数据与主线/中国位置阶段对照。

### Changed

- GitHub Pages 从仓库快照恢复数据，不再每次只导出临时 seed 数据库。
- 公开首页从多模块平铺改为 Today、趋势主线、两年演进三层阅读路径；角色、资源、星探和系统信息按需展开。
- 历史节点不伪造传播热度；缺少可比观测时 `heatScore` 保持 0。

### Security

- 快照剔除原始 metadata、认证类 URL 参数、本机路径与敏感键，并在工作流提交前二次扫描。
- 定时任务串行执行、无变化不提交；使用 GitHub Actions bot 身份和仓库内置 token。

### Known limitations

- 两年基线是 30 个高价值里程碑，不是 25 个月的完整新闻档案；季度/月度 coverage matrix 仍待建设。
- 定时采集产生的新事件默认保持 review，不会绕过人工事实与洞察审核自动公开。
- MySQL、回填 checkpoint、snapshot approval/rollback 和跨语言语义聚类仍未达到生产水位。

## [0.3.0] - 2026-07-11

### Added

- Source Discovery 数据层：保存聚合器发现的原始 URL、来源身份、关键账号、热度和匹配状态。
- AI HOT 上游 URL 解析与 HuggingNews 关键账号发现；无法匹配的一律进入候选队列。
- 来源身份配置与直接源匹配，新增 Google Research、BAIR、OpenRouter、Thinking Machines、Claude Code Releases 等上游源。
- 官方模型价格与订阅基线目录，包括厂商定价页、Apple App Store 和独立汇率源。
- 后台来源雷达与“一手来源归属”评测维度。

### Changed

- 聚合器不再写入事实 Signal，也不会参与 Event 聚类；聚合热度只会回填到相同原始 URL 的直接来源信号。
- PriceAI 仅作为人工比较入口，不复制其受限生产数据；价格数据改为独立采集官方证据。
- 来源目录扩充到 195 个，覆盖 14 类。

### Known limitations

- HuggingNews 目前只能从公开页面还原关键账号和传播簇，不能还原原帖 URL 时会保持 `heat_only`。
- 新发现的未知域名需要人工核验、配置 fixture 并通过 shadow run 后才能晋级。
- 现有历史数据库中的聚合器 Signal 会在评测中显示为证据债务，不会被静默改写。

## [0.2.0] - 2026-07-11

### Added

- 100+ 高价值知识源目录，覆盖全球与中国厂商、研究评测、开源、Agent、机器人、芯片云、资本、政策、专家、媒体和社交热度。
- Source lifecycle、健康分、SourceRun、策略字段和管理台操作。
- 有界并发、结构化错误、瞬时错误重试、退避抖动、Retry-After、ETag/Last-Modified、逐跳 SSRF 检查和流式响应上限。
- Opportunity Scout v1：证据绑定、三类机会、冷却去重、状态流转、人工公开门禁和静态观测站。
- Capability Map、State 1–5 Roadmap、多维 Evaluation Scorecard 和公开 Evolution Spine。

### Changed

- 重新审计项目水位，从“第一阶段已完成”修正为 Stage 1.2 / 5 的可演示骨架。
- 产品空间收敛为 Today、Timeline、Radar、Inbox；Changelog 与 Roadmap 进入产品自身。
- README 和旧 TASKS 去除热点、管理台、测试与发布闭环方面的过度承诺。

### Known limitations

- 公开事件仍以精选 seed 为主，不代表真实跨平台热点系统已经成立。
- Source Catalog 不等于全部已接入：只有少量来源 active，大部分处于 candidate/manual/restricted。
- 尚缺 Document/Observation 分离、调度、per-host 限流、完整 adapter fixtures、MySQL CI 和浏览器端到端测试。

## [0.1.0] - 2026-07-11

### Added

- Node.js + TypeScript + Fastify + Kysely 工程骨架。
- SQLite 默认数据库与 MySQL dialect。
- Signal、Event、Track、Actor、Model Resource、View 数据模型。
- 基础采集、聚类、评分、管理台、静态 Timeline、主题、详情抽屉与 GitHub Pages。

[0.4.0]: https://github.com/barretlee/agent-pulse/compare/v0.3.0...v0.4.0
[0.5.0]: https://github.com/barretlee/agent-pulse/compare/v0.4.0...v0.5.0
[0.5.1]: https://github.com/barretlee/agent-pulse/compare/v0.5.0...v0.5.1
[0.6.0]: https://github.com/barretlee/agent-pulse/compare/v0.5.1...v0.6.0
[0.3.0]: https://github.com/barretlee/agent-pulse/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/barretlee/agent-pulse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/barretlee/agent-pulse/releases/tag/v0.1.0
