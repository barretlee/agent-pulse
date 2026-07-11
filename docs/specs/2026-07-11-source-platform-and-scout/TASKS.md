# 实施清单

状态约定：只有代码、测试和验收证据齐备后才能勾选。设计、catalog 条目和预留字段不算能力完成。

## 已完成：Stage 2 foundation

- [x] 审视当前真实水位并冻结 Stage 1–5 演进模型
- [x] 重写项目级 AGENTS.md，纳入使命、主线、数据源治理、星探和演进约束
- [x] 增加来源 lifecycle、health、policy schema 和 SourceRun
- [x] 实现结构化 FetchError、条件请求、重试/退避/Retry-After
- [x] 实现有界并发和单源运行记录
- [x] 实现自动健康 reducer 与人工 lifecycle action
- [x] 增强后台来源运营控制面基础能力
- [x] 增加 ScoutInsight / ScoutEvidence schema
- [x] 实现证据型 Scout v1、冷却去重和状态流转
- [x] 增加星探管理 API、管理台和静态公开组件
- [x] 建立 100+ 高价值 Source Catalog 与覆盖分类
- [x] 建立 State 1–5 Roadmap、Capability Map、Changelog 和 Evaluation Scorecard
- [x] 补充 AI HOT、HuggingNews 和 PriceAI 公开接入/许可审计
- [x] 明确聚合站只用于 discovery/heat，事实必须回源
- [x] 定义来源发现、shadow、晋级、降级、隔离和软卸载流程

## 必补验证：不能因此宣称 Stage 2 完成

- [ ] 补齐真实浏览器 UI 验收
- [ ] 补齐真实 MySQL migration/repository 集成验收
- [ ] 为核心 active 来源建立 adapter contract fixtures 和 7/30 天 SLO
- [ ] 运行 2–4 周，建立 success、freshness、empty、drift 和回源率 baseline
- [ ] 验证管理台修改、approved snapshot 与 GitHub Pages 的运营发布闭环
- [ ] 用真实跨平台数据校准热点，不能使用 seed 分数作 baseline

## Source Discovery 与晋级

- [x] 建立聚合发现记录的基础 schema，区分 discovery URL 与 origin URL
- [x] 保存 pending/candidate/matched source/merged signal 状态
- [x] 管理台展示聚合发现、原始来源和匹配状态
- [ ] 从 event backlinks、Actor 官网/论文/GitHub 和覆盖缺口生成候选来源
- [ ] 建立 source candidate 的原创性、准确性、稳定性、增量覆盖、独立性、合规成本评分
- [ ] `draft -> shadow` 前强制检查 policy、manifest、fixture 和 contract
- [ ] `shadow -> active` 前展示连续运行 SLO、回源率和人工抽检证据
- [ ] 所有晋级、降级、隔离、恢复和退役写入 append-only audit
- [ ] 建立专家/CXO/记者/投资人 identity 与 media-group 关系
- [ ] coverage map 同时展示“目录覆盖”和“近 30 天有效观测”

## Source Package 与采集运行时

- [ ] 将当前 adapter 升级为带 manifest、config/state schema、probe、nextState、diagnostics 的 source package
- [ ] 支持 package install/upgrade/soft-uninstall，并验证退役不破坏历史 provenance
- [ ] AI HOT 实现 fingerprint-first、per-query ETag、304、cursor 和公开限流退避
- [ ] HuggingNews 保持 disabled/shadow，补 HTML drift 与异常空结果探测；正式 API/RSS 上线后再迁移
- [ ] 实现 scheduler、per-host token bucket、source lease 和 backfill/realtime 队列隔离
- [ ] 实现 circuit breaker、half-open probe 与 degraded schedule
- [ ] 实现流式 body limit、逐跳 redirect SSRF 复验和 DNS rebinding 防护测试
- [ ] cursor/cache state 与 signals/source run 原子提交，失败不推进 state

## Provenance、聚类与热点

- [ ] 每条 aggregator discovery 均保存完整 origin verification 状态
- [ ] 无可验证原始事实源的内容只能停留 candidate/review
- [ ] 按 source、author、media group 和引用链计算独立性
- [ ] 识别媒体矩阵转载并加入 repost penalty
- [ ] 引入平台、地区、语言、velocity、persistence 的真实观测窗口
- [ ] 建立中英文 Actor/entity alias 和跨语种事件聚类
- [ ] 保存自动分数、人工覆盖原值、理由、操作者和时间

## PriceAI 与模型资源

- [x] 当前只保留明确归属的 PriceAI 外链和风险说明
- [x] 记录生产价格、渠道、库存、freshness 和 crawl log 不可批量复制的许可边界
- [ ] 获得书面许可或正式 API 前，不启用 PriceAI 生产数据 adapter
- [ ] 厂商官方价格独立回源采集，记录地区、单位、证据和核验时间
- [ ] fixture、seed 和公开静态 JSON 不嵌入 PriceAI 受限生产快照

## 管理台与发布闭环

- [ ] Source UI 完成候选审核、policy、contract、SLO 晋级和状态审计
- [ ] Signal UI 支持 provenance、去重、聚类和证据角色查看
- [ ] Event UI 支持合并/拆分、冲突、事实与推断审核
- [ ] Track UI 支持阶段、里程碑、排序、转折和对比关系
- [ ] Actor UI 显示角色时间轴和跟随/并跑/领先证据
- [ ] View composer 使用 typed config，且静态前台真实消费
- [ ] 支持 snapshot preview、diff、approve、publish 和 rollback
- [ ] GitHub Pages 只发布 approved privacy-safe snapshot

## 星探后续

- [x] Scout v1 只基于 published Event，保存证据并通过 cooldown 去重
- [x] 支持 inbox、accepted、dismissed、archived、published 等基础状态
- [ ] 补齐 venture/media/work/learning/artifact/influence 六类产品视图
- [ ] 每张卡完整包含 why now、非共识、首个实验、风险和失效条件
- [ ] 实现 novelty、actionability、owner fit、timing、evidence strength 可解释排名
- [ ] 支持收藏、转任务/选题、暂缓、驳回原因和偏好/禁区
- [ ] 保存 model/prompt/version/input refs，支持评估与回放
- [ ] 建立重复率、接受率、实验转化率和结果复盘指标
- [ ] Scout 默认私有；公开和任何外部动作都需独立人审

## Stage 3–5

- [ ] Stage 3：Entity / Claim / Evidence / Contradiction 图谱与多语言语义聚类
- [ ] Stage 4：关注组合、情景推演、领先指标、预测登记与反馈校准
- [ ] Stage 5：受治理的来源自发现、adapter 提案、agent 调研和实验系统
