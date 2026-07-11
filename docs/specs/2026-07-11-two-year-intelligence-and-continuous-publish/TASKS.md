# 两年行业情报回溯与持续发布实施清单

状态约定：除规格与研究外，本清单均为后续任务。只有代码、测试、运行和发布证据齐备后才能勾选。

## 0. 规格与研究

- [x] 定义 2024-07-01 至 2026-07-11 历史窗口
- [x] 定义技术、AGI、投资、商业化、产品、To C/B/D/G、中国追赶主线
- [x] 定义历史事实发布门槛、回源、去重、阶段总结和持续发布验收
- [x] 盘点官方 archive、论文、资本、政策、产品、聚合站和社交历史边界
- [x] 完成 v0.4.0 基线切片的 schema、许可边界、静态输出和发布闭环评审
- [ ] 完成全量回填、分片、审批与回滚方案评审后，再实施后续生产化范围

## 0.5 v0.4.0 已交付切片

- [x] 建立 30 个一手来源历史里程碑，覆盖 2024-07 至 2026-05，并与近期节点合并为 36 个公开 Event
- [x] 历史节点缺少可比传播观测时将 `heatScore` 保持为 0
- [x] 建立 5 个行业阶段和技术/AGI/商业化/投资/中国追赶/模型经济学 6 条主线总结
- [x] 新增确定性、隐私安全的 `data/snapshot/v1.json`，支持 merge restore
- [x] 新增每 6 小时 GitHub Actions 采集、快照提交和 Pages 显式部署链路
- [x] GitHub Pages 从仓库快照恢复，不再只导出临时 seed 数据库
- [ ] 这只是高价值基线，不代表后续完整 coverage、Document/Observation、claim evidence、approval/rollback 已完成

## 1. Coverage 与 source archive manifest

- [ ] 建立 2024-07 至 2026-07 的 source x month coverage matrix
- [ ] 为 active/candidate 官方源记录 historicalFrom/To、archiveStrategy、dateSemantics
- [ ] 为每个主线建立优先 Actor、source、document type 和 coverage owner
- [ ] 区分 catalog coverage、archive availability 和 effective observation
- [ ] 标记 restricted、manual、unavailable 和 evidence gap
- [ ] 建立国内外、Tier、角色、语言、传播域覆盖统计
- [ ] 审核 Web Archive、交易所、监管和论文索引的使用政策

## 2. Backfill runtime

- [ ] 新增 BackfillRun/BackfillCheckpoint schema 和 repository
- [ ] 任务按 source x month 分区并支持幂等 idempotency key
- [ ] 实现 realtime/backfill 独立 queue、concurrency 和 budget
- [ ] 实现 pause、resume、cancel、retry、replay
- [ ] 实现失败不推进 checkpoint、事务提交和中断恢复
- [ ] 实现实时 backlog/429/数据库压力触发 backfill 降速
- [ ] 记录请求、bytes、retry、error、产出、重复和耗时
- [ ] 后台显示批次、进度、缺口、错误和成本

## 3. Document / Observation / 时间模型

- [ ] 新增 Document 与 SourceObservation 模型
- [ ] 迁移/兼容现有 Signal provenance，不丢失历史关联
- [ ] 保存 occurred/published/observed/verified/asOf 和 timePrecision
- [ ] 处理首次发布、更新时间、相对时间和时间范围
- [ ] 区分 original、archive、aggregator 和 media discovery URL
- [ ] 不保存无授权完整正文；fixture/raw debug 数据设置边界与 TTL
- [ ] 同 Document 多来源观察不再因 URL 去重丢失

## 4. Identity、回源与文档去重

- [ ] 建立 publisher/author/media-group identity 和 aliases
- [ ] 实现 aggregator/media -> original URL resolver
- [ ] 保存 verified/broken/restricted/conflicting 回源状态
- [ ] 实现 canonical URL、external ID、content hash 和 near-duplicate
- [ ] 识别 translation、repost、correction 和 archived copy
- [ ] 同媒体集团和同作者跨平台传播不重复计算独立性
- [ ] 无法回源的候选进入 evidence gap，不进入公开事实
- [ ] 人工去重/回源修正保留审计和 replay fixture

## 5. Claim、Evidence 与 Event 聚类

- [ ] 新增 Claim/ClaimEvidence 或等价 claim-level provenance
- [ ] 实体、claim、引用链、event type、version、时间和语义共同生成候选
- [ ] 支持跨中英文 aliases 和语义聚类
- [ ] 区分首发、版本、价格、API、分发、融资和复现节点
- [ ] 建立 contradiction/correction/rumor-confirmation 关系
- [ ] 自动聚类只进入 review，不直接发布
- [ ] 实现 Event merge/split/version 和审计
- [ ] 构建至少 300 组 golden pair set
- [ ] 达到文档去重 precision 与 Event pairwise F1 门槛

## 6. 历史内容收敛

- [ ] 建立当时视角与回看验证双层内容 schema
- [ ] 自动大纲区分 fact、reason、impact、signal、future、decision
- [ ] 重大数字和能力 claim 绑定 claim-level evidence
- [ ] 公司自测、专业验证和独立复现分开呈现
- [ ] heat 保存 observed/reconstructed/unknown，不用默认分补空
- [ ] 保存自动评分、数据质量、人工覆盖和理由
- [ ] 未完成收敛/含占位文本的 Event 不能发布

## 7. 主线编排

- [ ] 为 10 条主线冻结 stage taxonomy、node role 和关系类型
- [ ] 同一 Event 可入多线，但事实只保存一次
- [ ] 支持 predecessor/successor/cause/enables/competes/contradicts/validates
- [ ] 技术与 AGI 节点区分 benchmark、演示、独立复现和生产能力
- [ ] 投资节点连接能力、资产、团队和商业验证
- [ ] 商业化与产品节点连接成本、定价、分发、留存和 ROI
- [ ] To C/B/D/G 各自建立成熟度与采购/使用证据
- [ ] 中国追赶每个阶段绑定同维度海外 benchmark
- [ ] 管理台支持阶段、排序、里程碑、转折和对比审核

## 8. 阶段总结

- [ ] 新增 PeriodSummary、版本和 evidence gap schema
- [ ] 生成 25 个月度 Pulse coverage record
- [ ] 每条主线生成 2024 Q3 至 2026 Q3（截至 07-11）的季度 Phase
- [ ] 生成 2024 H2、2025、2026 YTD 年度/半年度 Arc
- [ ] 生成两年 Synthesis 和中国相对位置总览
- [ ] 每个事实句能回到 Claim/Event；推断显式标注
- [ ] 关键节点不足时输出 evidence gap，不生成空泛趋势
- [ ] LLM draft 保存 model/prompt/input refs 并强制人审
- [ ] 阶段修订产生新版本和 changelog

## 9. Snapshot 与连续发布

- [ ] 新增 PublishSnapshot、approval、diff 和 rollback metadata
- [ ] 静态数据按 timeline month、track period、summary 分片
- [ ] manifest/current pointer 使用 schema version 和 content hash
- [ ] preview 显示 added/updated/merged/split/withdrawn
- [ ] evidence、schema、privacy、duplicate、coverage、citation 门禁
- [ ] approved 后才可进入 Pages artifact
- [ ] 数据分片先发布，最后切换 current pointer
- [ ] 失败保留上一 snapshot；rollback 只切 pointer
- [ ] Event stable URL、redirect/tombstone 和修订说明
- [ ] 同输入/策略版本的 snapshot hash 可复现

## 10. 前台体验

- [ ] 支持主线、阶段、时间、Actor、地区、受众筛选
- [ ] 首屏只加载 current/index/最近分片
- [ ] 详情区分当时视角、回看验证、事实/推断和 heat 数据质量
- [ ] 展示月度、季度、年度和两年阶段总结
- [ ] 中国追赶支持同维度国内外节点对照
- [ ] 合并、撤回和修订 URL 有清晰状态
- [ ] 375px 移动端和键盘/屏幕阅读器可完整使用

## 11. 分批执行

- [ ] Wave 1：2024-07 至 2024-12
- [ ] Wave 2：2025-01 至 2025-06
- [ ] Wave 3：2025-07 至 2025-12
- [ ] Wave 4：2026-01 至 2026-06
- [ ] Wave 5：2026-07-01 至 2026-07-11
- [ ] 每批完成 coverage review、golden 修正、阶段总结和 snapshot 验收
- [ ] 前一批的 aliases、转载关系和质量问题反馈到后一批

## 12. 发布完成门禁

- [ ] 25 个日历月全部有 covered/sparse/evidence_gap 状态
- [ ] 公开历史 Event 100% 满足事实证据门槛
- [ ] 聚合站 primary evidence count 为 0
- [ ] 文档去重 precision >= 0.99，Event pairwise F1 >= 0.90
- [ ] 每条主线-季度有审核总结或明确证据不足
- [ ] realtime freshness 在 backfill 压力下达标
- [ ] SQLite、真实 MySQL、浏览器、隐私和 Pages 回滚测试通过
- [ ] README/ROADMAP/Capability Map 如实区分 planned、experimental、operational
