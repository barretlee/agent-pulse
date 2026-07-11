# Agent Pulse State 1–5 Roadmap

Roadmap 按系统成熟状态组织，而不是按页面数量组织。`AGENTS.md` 中的七项长期能力——可信时间轴、事件理解、证据洞察、Opportunity Scout、知识网络、趋势预测、决策副驾——被压缩映射到五个可验收 State。每个 State 必须同时交付能力、数据质量、产品体验和治理证据。

## State 1：可信时间轴骨架（当前约 1.2）

目标：把分散信号变成唯一、可审核、可发布的 Event。

- M1：Node/TypeScript、SQLite、migration、统一 Adapter 与可复现 CLI。
- M2：Event / Track / Actor / Evidence 模型、静态 Timeline、详情抽屉。
- M3：管理审核、隐私 allowlist、CI / Pages 和版本化 Changelog。
- M4：用真实数据替换 demo 分数，完成后台快照到 Pages 的发布/回滚闭环。

退出指标：公开事实 100% 有证据；CI/Pages 可复现；公开数据不含内部字段；管理发布结果能形成可回滚快照。当前 M1–M3 有骨架，M4 未完成。

## State 2：可信感知网络（建设中）

目标：来源长期可运行，质量、覆盖、成本和缺口可量化。

- M1：100+ 高价值 Source Catalog，区分 active/candidate/manual/restricted 并覆盖国内外 12+ 类来源。
- M2：生命周期、fixture/contract、重试限流、条件请求、checkpoint、SourceRun 与 7/30 日 SLO。
- M3：Document / SourceObservation 分离，保留同一内容的多来源传播、作者与媒体矩阵关系。
- M4：scheduler、漂移检测、fallback、shadow verification、回放与 adapter 安装/升级/退役。

退出指标：active 来源 7 天成功率 ≥95%；contract fixture 覆盖 100%；P95 freshness 达标；异常来源 5 分钟可定位；同 URL 跨源观察不丢失。

## State 3：行业理解与证据洞察

目标：从“发生了什么”升级为“为什么变化、如何连接、可能错在哪”。

- M1：多语言 Entity / Claim / Evidence / Contradiction 知识图谱。
- M2：Fact / Reason / Impact / Signal / Future / Decision 自动收敛与 golden evaluation set。
- M3：具有阶段、转折、因果、对比和阶段总结的 Narrative Timeline。
- M4：Opportunity Scout Beta，建立证据、反证、去重、反馈和产物闭环。

退出指标：公开事实 claim 证据覆盖 100%；聚类/实体 F1 ≥0.85；人工抽检事实错误为 0；Scout helpful ≥60%、重复/空泛 ≤20%。

## 跨 State 工作流：2024-07 至 2026-07 两年历史基线（基础版已启动）

这不是独立 State，也不能靠增加事件数量提升成熟度。它同时服务 State 1 的真实时间轴、State 2 的 archive/运行能力和 State 3 的 Narrative Timeline。

v0.4.0 已交付第一批 30 个一手来源历史里程碑、5 个行业阶段、6 条高层主线、仓库 JSON 快照和定时 Pages 发布链路；以下 H1-H5 仍代表完整生产水位，而不是已完成声明。

- H1：完成 25 个日历月的 source/archive coverage matrix，所有主线-季度单元标记 covered、sparse 或 evidence_gap。
- H2：建立 realtime/backfill 双 lane、source-month checkpoint、Document/Observation 分层和历史时间语义。
- H3：建立 claim-level evidence、跨语种去重/聚类 golden set，以及当时视角/回看验证双层内容。
- H4：完成技术、AGI、投资、商业化、产品、To C/B/D/G、中国追赶的季度 Phase、年度 Arc 和两年 Synthesis。
- H5：建立 approved snapshot、静态分片、preview/diff/publish/rollback，历史回填不阻塞当天情报。

退出指标：历史公开 Event 事实门禁通过率 100%；聚合站 primary evidence count 为 0；文档去重 precision ≥0.99；Event pairwise F1 ≥0.90；每条主线-季度有审核总结或证据缺口；实时 freshness 在 backfill 压力下达标；SQLite、MySQL、浏览器、隐私和 Pages 回滚均有实测证据。

实施与验收详见 [`docs/specs/2026-07-11-two-year-intelligence-and-continuous-publish/`](specs/2026-07-11-two-year-intelligence-and-continuous-publish/PRD.md)。

## State 4：个人战略与知识网络

目标：把行业变化连接到个人/组织目标、行动和可复用资产。

- M1：CEO / 投资 / 技术 / 创业关注组合与本地 Owner Profile。
- M2：Scout → 48 小时验证 → 7 日产物 → 30 日结果复盘。
- M3：认知、作品、关系、职业资本和影响力的长期资产图谱。
- M4：个性化 weekly decision brief、弱信号预算和主题疲劳控制。

退出指标：Scout → action ≥20%；action → artifact ≥30%；月均 2 个可复用产物；每周节省信息整理 ≥3 小时；打扰率 <10%。

## State 5：可校准的 AI 决策副驾

目标：从持续观察走向可验证预测，并在治理边界内自我演进。

- M1：Scenario、领先指标、预测 Ledger、概率与 Brier calibration。
- M2：自动发现 coverage/capability gap，提出 Source / Detector / Adapter 规格与实现建议。
- M3：shadow replay、策略 A/B、回归门禁、自动回滚与人工 promotion。
- M4：受权限、预算、审计和人工批准约束的多 Agent 调研与实验网络。

退出指标：预测按季度校准；转折提前量可统计；策略变更可回放和一键回滚；外部写入、公开发布、权限扩大和预算消耗始终有明确审批。

## 每次迭代的能力审视

每个 release 必须回答：

1. 新增或提升了哪些可复用能力，而不只是新增了哪些页面？
2. 能力的状态、成熟度、代码/测试/运行证据是什么？
3. 哪些评测维度提升，样本量是否足够？
4. 解决了哪个 State 的哪个 milestone？
5. 引入了哪些新风险、债务、维护成本与下一步行动？

这些信息同时进入 `src/catalog/product.ts`、`CHANGELOG.md`、后台评测中心与公开 Evolution Spine。
