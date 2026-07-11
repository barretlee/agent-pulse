# Changelog

所有值得用户感知的 Agent Pulse 变化都会记录在这里。版本遵循语义化版本，能力状态分为 planned、experimental 和 operational；只有拥有代码、测试或运行证据的能力才会进入 release。

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
[0.3.0]: https://github.com/barretlee/agent-pulse/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/barretlee/agent-pulse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/barretlee/agent-pulse/releases/tag/v0.1.0
