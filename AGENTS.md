# AGENTS.md

## 项目使命

Agent Pulse 不是新闻聚合器，而是一个中国优先、全球覆盖的 AI 行业认知与行动系统。它面向 CEO、投资负责人、创业者、业务负责人和技术负责人，把发布、论文、资本动作、政策与跨平台传播信号收敛为可验证、可复述、可行动的行业主线。

每个公开事件都应回答：发生了什么、证据是什么、为什么重要、影响谁、下一步观察什么、可以采取什么动作。

## 协作约定

- 产品文案、PRD、规格、运营说明默认使用中文；代码、标识符、注释和提交信息默认使用英文。
- 修改架构、schema、采集、排名、发布、来源生命周期或星探能力前，先阅读 `docs/specs/` 中对应规格；跨层变更必须 docs-first。
- 搜索现有实现后再编辑，优先扩展既有模块，保持 diff 小、可回滚。
- SQLite 是零配置默认数据库；只有通过 MySQL 集成验证后，才能宣称某项能力兼容 MySQL。
- 使用 `npm`；提交前执行 `npm run check`，并补充与风险相称的契约、集成和浏览器测试。
- 不得把 seed/demo、预留字段、设计文档或未被前台消费的配置描述成已实现能力。

## 情报模型与主线

- `Event` 是唯一事实节点；`Track`、`Actor`、`Audience`、`Region`、`Technology`、`Resource` 和 `Opportunity` 只附着解释，不复制事实。
- 必须同时维护技术演进、AGI、投资、商业化、中国追赶以及 To C / To B / To D / To G 主线。
- 支线至少能按技术、地域、公司、人物、政策、场景和时间阶段组织，并与主线共享证据。
- 主线不是普通筛选标签：应逐步支持阶段、里程碑、转折、因果、对比和阶段性总结。
- “角色已收录”与“角色已被有效观测”必须分开表达；跟随、并跑、领先、受限或出海判断必须绑定证据节点。

## 事实、判断与热点

- 明确区分事实、推断、观点、预测和机会假设；不确定内容必须标注证据状态与置信度。
- 聚合站只能用于候选发现、聚类提示或传播热度，不能作为重大事实的唯一证据。
- 公开事实原则上至少需要一个 Tier 1 原始证据，或两个相互独立的 Tier 2 证据；例外必须明确标记为“待证实”。
- 每个公开事件必须回链可点击的原始证据；禁止发布第三方完整正文。
- 热点必须来自真实传播证据，不得把手工分数包装成已测量热度。
- 来源独立性按 source、author 和 media group 判断，不能用来源角色或权威分代替身份去重。
- 热度至少考虑独立作者、独立来源、平台宽度、地区/语言宽度、扩散速度、持续性、转载矩阵和时间衰减。
- 人工覆盖评分必须保留原值、原因、时间和审计记录。

## 数据源是一等资产

- 所有 collector 必须位于统一 `SourceAdapter` 契约之后；编排层不得出现来源特例。
- Source 至少记录 owner、tier、role、region、language、acquisition、license/robots、frequency、quota、authority、freshness SLO、adapter version、health 和 lifecycle state。
- 生命周期统一按 `draft -> shadow -> active -> degraded -> quarantined -> retired` 演进；`shadow` 是隔离验证阶段，`retired` 是保留历史 provenance 的软卸载。
- 新来源默认 `draft` 或 `shadow`；只有通过契约测试、合规检查和真实运行窗口后才能晋级 `active`。
- adapter 应具备 capability manifest、配置 schema、规范化 schema、cursor/cache state、fixture、contract test、health probe 和版本迁移/卸载策略。
- 来源管理应支持发现、试拉取、启用、停用、降级、隔离、恢复和软卸载；退役不得破坏历史 provenance。
- 高价值来源地图必须区分已接入、待接入、受限、替代来源和覆盖缺口，并显示国内/海外、官方/专家/社交覆盖率。
- 博主、学者、CXO、记者和投资机构必须维护身份、机构关系和媒体矩阵归属，避免制造虚假独立来源数。

## 采集稳定性与安全

- 优先使用官方 API、RSS、Atom、GitHub Releases 和稳定公开数据；遵守 robots、许可和速率限制，不绕过登录、WAF、CAPTCHA 或付费墙。
- 请求必须具备 timeout、有限 retry、指数 backoff + jitter、`Retry-After`、并发/速率预算和流式响应体上限。
- 每个 HTTP redirect 都必须重新执行 SSRF 检查；禁止 loopback、link-local、私网、凭据 URL 和 DNS rebinding 风险。
- ETag、Last-Modified、cursor 和 fingerprint 必须原子持久化；失败不得推进 cursor。
- 单来源失败不得中断整批任务；连续失败应触发 circuit breaker 和降级，恢复需经过 probe/shadow verification。
- 每次运行记录 source、adapter version、耗时、状态、item counts、cursor、错误分类和重试次数；parser 漂移、异常空结果、数量突变和时间异常应可见。
- 新增或修改来源时，必须同时提供 fixture、成功路径、失败/降级路径和 schema 漂移测试。

## 收敛、管理与发布

- 原始 payload 只存在于受控证据层，公开输出只使用 allowlist DTO。
- 自动收敛必须经过 schema 校验、去重、聚类、事实提取、证据绑定、冲突检测和审核。
- LLM 生成的洞察必须可追溯到 evidence；未完成收敛的事件保持 `review`，不得用占位洞察发布。
- 管理台应覆盖 source、signal、event、track、actor、resource、view 和 job 的完整工作流。
- “可视化编排”必须被静态前台真实消费，并支持预览、diff、发布和回滚，不能只保存 JSON。
- 管理台写入、静态 snapshot 和 GitHub Pages 发布之间必须有可验证闭环。
- 公开站保持完全静态、隐私安全、可回滚；管理台、token、数据库、原始 payload、本机路径和私有备注永不进入 Pages。

## 星探精灵

- Scout 是机会与认知助手，不是事实发布器。
- 输出类型包括创业机会、自媒体选题、工作/产品机会、认知升级、可沉淀产物和影响力动作。
- 每条想法必须绑定触发事件与证据，并说明目标用户、为什么是现在、非共识点、建议产物、首个小实验、风险和失效条件。
- Scout 结果必须可去重、收藏、暂缓、驳回和反馈，并从反馈中调整个人偏好。
- Scout 建议不得自动变成公开事实、投资结论或外部动作；发布和执行必须经过人审。
- 优先 novelty、actionability、owner fit、timing 和 evidence strength，避免围绕同一热点批量生成空泛想法。

## 自我演进与完成标准

- 系统维护 capability registry、coverage map、quality scorecard 和 maturity stage。
- 自我生长遵循“发现缺口 -> proposal/spec -> fixture/test -> shadow verification -> 人审 -> rollout -> 复盘”，不得在运行时静默修改 schema、排名或发布规则。
- 来源许可边界、schema、排名和发布规则变化必须 docs-first，并具备迁移、回滚和审计方案。
- TASKS 只能在代码、测试和验收证据齐备后勾选；experimental 能力必须明确标注。
- 完成定义至少包括 lint、typecheck、单元/集成测试、静态导出隐私扫描和关键浏览器 smoke；来源变更还必须通过 contract、失败隔离和降级恢复测试。

## 安全与隐私

- 永不提交 `.env`、数据库、token、cookie、私有 feed、原始 collector payload、本机路径或个人数据。
- 非开发/测试环境的管理写操作必须使用 `ADMIN_TOKEN`，并保留审计边界。
- 外部文字必须按文本渲染；禁止执行来源 HTML。
- 发现来源许可、隐私或安全边界不清时，默认停在 `draft` 或 `quarantined`，先记录风险再接入。
