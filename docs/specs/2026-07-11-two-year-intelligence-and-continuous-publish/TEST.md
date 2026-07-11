# 两年行业情报回溯与持续发布测试计划

- 状态：Proposed
- 原则：本文件是目标验收矩阵；未通过前不得宣称两年回溯或持续发布已完成。

## 1. 时间与分区

- 历史窗口严格限制在 2024-07-01 至 2026-07-11；
- 月分区覆盖 2024-07 至 2026-07 共 25 个日历月；
- partial month 2026-07 明确截止到 07-11，不伪装完整月份；
- UTC 存储、中文展示和来源本地时区转换正确；
- occurred/published/observed/verified/asOf 不互相覆盖；
- day/month/range/unknown time precision 可往返序列化；
- 相对时间保存解析基准，重放结果稳定；
- 来源更新时间不覆盖首次发布时间。

## 2. Coverage Matrix

- 每个 month、track、region、tier 单元可计算；
- covered/sparse/evidence_gap 状态互斥且有理由；
- catalog source 不会被计为有效 Observation；
- disabled/restricted source 不进入 active coverage；
- 中国与全球统计不会因 GLOBAL/CN aliases 重复；
- 没有事件的季度仍显示 gap，而不是从输出消失；
- coverage review 保存 reviewer、时间和版本。

## 3. Backfill 状态机

- planned/acquiring/normalizing/clustering/reviewing/approved/published 转换合法；
- paused 可恢复到原阶段；cancelled 不再调度；
- failed run 保留 diagnostics 且不推进 checkpoint；
- 同 source-month idempotency key 不创建重复 run；
- 中断后从最后已提交 checkpoint 恢复；
- replay 使用固定 fixture/policy/version 产生相同规范化结果；
- backfill 任务不能越过目标月份和历史窗口；
- operator action 和自动转换均有审计。

## 4. Realtime / Backfill 隔离

- backfill 并发不超过独立预算；
- realtime 保留最低 worker/network 份额；
- 同域 realtime/backfill 合并遵守 upstream rate limit；
- realtime backlog 超阈值时 backfill 降速/暂停；
- 429/Retry-After 不造成两个 lane 重试风暴；
- backfill 大批写入下 realtime P95 freshness 不退化到 SLO 外；
- backfill cancel 不影响 realtime job；
- 队列饥饿、公平性和 lease 回收有压力测试。

## 5. 获取、许可与安全

- 只有 manifest 标记 backfillEnabled 的来源进入历史队列；
- historicalFrom/To、archiveStrategy、dateSemantics 校验；
- 不绕过登录、WAF、验证码或付费墙；
- robots/license 过期或变化会暂停对应 backfill；
- redirect 每一跳执行 SSRF 检查；
- archive URL 与 original URL 分开保存；
- response body 流式限额、timeout、retry 和 content-type 校验有效；
- raw debug payload 遵守 TTL，不进入 Git/公开 snapshot；
- PriceAI 受限生产数据不会被历史任务采集。

## 6. Document 去重与 Observation 保留

- tracking、fragment、host case、尾斜杠 canonicalization；
- 同 canonical URL 只产生一个 Document；
- URL 不同、content hash 相同可识别 exact duplicate；
- 轻微模板变化可识别 near duplicate，不误合不同版本；
- 同 Document 在多个来源/平台的 Observation 全部保留；
- 多语言翻译关联同一 root document/event，但保留语言 Observation；
- archived copy 不创建第二个 original Document；
- correction/update 与原文建立版本关系，不静默覆盖；
- golden set 上文档去重 precision >= 0.99。

## 7. 回源与独立性

- AI HOT/HuggingNews discovery primary evidence count 恒为 0；
- aggregator original URL 可解析到 publisher Document；
- broken/restricted/conflicting 状态不会被当 verified；
- 原始页面失效但可信 archive + Tier 2 验证满足特殊门槛；
- 同媒体集团多站转载只计一个独立 group；
- 同作者跨 X、博客、Newsletter 不重复计独立作者；
- 两个不同机构引用同一公告可计 verification，但不是两个 primary；
- 原始文件、专业验证、观点、heat roles 正确；
- 所有人工 identity/provenance 修正可回放。

## 8. Claim 与 Event 聚类

### Golden set

至少 300 对，覆盖：

- 同一发布的中英文版本；
- 同一模型不同版本；
- 首发、API 开放、降价、企业分发；
- rumor、确认、撤回；
- 论文、官方博客和独立复现；
- 同日同公司多个不同产品；
- 融资公告与后续交割；
- 中国/海外同路线但不同事件。

### 指标与边界

- Event pairwise F1 >= 0.90；
- 严重 false merge <= 0.5%；
- false split 有可解释抽检；
- 自动聚类只生成 review candidate；
- merge/split 保留前后 IDs、理由和 policy version；
- contradiction 不被相似度强行吞并；
- EventVersion 修改不会丢失旧公开证据。

## 9. 历史事实发布门禁

- Tier 1 原始来源单独可满足事实门槛；
- 原始缺档时必须 archive + 独立 Tier 2；
- 只有两个 Tier 2 时强制显示缺原档标记；
- 聚合摘要、搜索 snippet 或单一转述无法发布；
- 融资、监管、财务、安全和重大能力 claim 优先要求原始文件；
- 公司自测与独立复现分开；
- 时间、主体或核心动作冲突未解决时拒绝发布；
- 占位文本、无 evidence 洞察或不可解释分数拒绝发布；
- public Event 100% 有 verifiedAt、asOf、timePrecision 和 evidence status。

## 10. 后见偏差与历史热度

- 当时视角只能引用 asOf 之前 Evidence；
- 回看验证独立展示并产生新版本；
- 后来成功不会回写成当时高 confidence；
- observed/reconstructed/unknown heat 三类正确；
- unknown 不生成默认数值或与 observed 混排；
- reconstructed 展示方法、来源和不确定性；
- 当前影响评估与当时传播热度不会复用同一字段。

## 11. 主线与中国追赶

- 每个 Event 至少属于一条 Track；
- 同一事实进入多 Track 不复制 Event；
- track narrative、stage、order 和 node role 可独立版本化；
- predecessor/successor/cause/enables/competes/contradicts/validates 有效；
- 技术与 AGI 不把 benchmark 直接等同生产能力；
- To C/B/D/G 使用各自证据口径；
- 中国 following/closing/parallel/leading/constrained/globalizing 绑定同维度 benchmark；
- 同一 Actor 在不同维度可处于不同 progress stage；
- actor catalog entry 不会自动生成追赶结论。

## 12. PeriodSummary

- month/quarter/year/two-year period 边界正确；
- 2024 Q3 和 2026 Q3 识别为 partial period；
- 每个事实句映射 approved Claim/Event；
- inference 句显式标注；
- review/rejected Event 不可进入 summary；
- 关键节点不足时输出 evidence_gap；
- 3–7 个关键节点上限/下限或不足理由有效；
- LLM draft 保存 model/prompt/input refs；
- 人工修订产生 version/changelog；
- summary 更新不会改写旧 snapshot。

## 13. Snapshot 验证

- draft -> validating -> preview -> approved -> publishing -> published 状态合法；
- 未批准 snapshot 不进入公开 artifact；
- evidence、schema、privacy、broken-link、duplicate、coverage、citation 门禁逐项可失败；
- 同输入/策略/schema 产生相同 content hash；
- snapshot diff 正确列出 added/updated/merged/split/withdrawn；
- raw payload、内部错误、token、私有备注、本机路径不在输出；
- Event stable slug/ID；merge/withdraw 有 redirect/tombstone；
- failed publish 不改变 current pointer；
- rollback 恢复 previous snapshot 和 artifact hash。

## 14. 静态分片与前端

- manifest、current、month shards、track/summary shards schema 可校验；
- 首屏不请求 25 个月全量；
- 按需加载历史月且缓存有效；
- 搜索索引不泄露未审核/私有字段；
- 主线、阶段、时间、Actor、地区、受众组合筛选正确；
- 当时视角/回看验证/heat quality 标签可见；
- evidence link 可访问或显示 archive/broken 状态；
- 375px 无水平溢出，抽屉/全屏详情可读；
- 键盘、Esc、focus、aria 和 hash 深链正常；
- 大分片、离线缓存旧 schema 和 partial failure 有降级 UI。

## 15. 数据库兼容与恢复

- SQLite migration、indexes、WAL、backup/restore；
- 真实 MySQL service 执行相同 repository/backfill/snapshot 测试；
- checkpoint 事务、unique key 和排序语义一致；
- 10 万/50 万 Observation 与 1 万 Event 性能基线；
- 聚类候选不会全库 O(n²)；
- 数据库中断不留下假 approved/published snapshot；
- 恢复后 realtime/backfill lease 不重复执行。

## 16. 分批验收

每个 wave 均执行：

1. source/archive coverage review；
2. acquisition/checkpoint reconciliation；
3. date/provenance/duplicate 抽检；
4. cluster golden regression；
5. Event evidence gate；
6. Track/Phase 人工审核；
7. preview/diff/privacy/browser；
8. publish/rollback drill；
9. 缺口和规则反馈到下一 wave。

## 17. 最终发布门禁

- 25 个日历月全部有 coverage 状态；
- 10 条主线每季度有 reviewed Phase 或 evidence gap；
- 历史公开 Event 事实门禁通过率 100%；
- aggregator primary evidence count 为 0；
- 去重/聚类达到指标并有 golden 报告；
- realtime freshness 在 backfill 压力下达标；
- SQLite、MySQL、浏览器、安全、隐私和 rollback 全通过；
- README、ROADMAP、Capability Map 与实际状态一致；
- 两年 synthesis 经人工审阅，并能回答 PRD 的六个成功问题。
