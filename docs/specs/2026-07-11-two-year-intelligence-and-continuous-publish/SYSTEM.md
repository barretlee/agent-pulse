# 两年行业情报回溯与持续发布系统设计

- 状态：Proposed
- 说明：本文件描述目标架构，不代表当前仓库已经实现

## 1. 设计原则

1. 历史回填与实时情报共用事实、证据和发布门禁，但使用独立运行 lane。
2. Document、Observation、Signal、Claim、Event 分层，避免把转载量误当事实数量。
3. 历史时间采用 bitemporal/as-of 思维，区分当时可知信息与后来验证。
4. 每一步幂等、可 checkpoint、可回放；任何批次都能暂停而不污染公开站。
5. 聚合站只提供 discovery/heat，事实必须回到 original evidence。
6. 静态站按分片读取不可变 approved snapshot，发布失败可以原子回滚。

## 2. 总体架构

```text
                         Source / archive coverage plan
                                      |
                +---------------------+---------------------+
                |                                           |
                v                                           v
          realtime lane                               backfill lane
       recent active sources                 month partitions / budgets
                |                                           |
                +---------------------+---------------------+
                                      v
                              acquisition runtime
                 fetch / checkpoint / policy / SourceRun
                                      |
                                      v
                       Document + SourceObservation
                                      |
                   normalize / sanitize / canonicalize
                                      |
                         entity + claim extraction
                                      |
                      candidate event clustering
                                      |
                  contradiction / provenance / review
                                      |
                                      v
                              canonical Event
                       /             |             \
                Track nodes       Actor nodes       Evidence
                       \             |             /
                                      v
                monthly / quarterly / annual synthesis
                                      |
                       candidate public snapshot
                    quality gates -> human approval
                                      |
                                      v
                   immutable static shards + manifest
                                      |
                                GitHub Pages
```

## 3. 两条运行 lane

### 3.1 Realtime lane

- 处理正常 active source 和近期窗口；
- 保持最高 freshness 优先级；
- 不因 backfill 大量请求、数据库写入或聚类任务被饿死；
- 只消费当前 checkpoint，不扫描历史分区。

### 3.2 Backfill lane

- 任务单位是 `source x month`，而不是“整个来源两年”；
- 独立 concurrency、rate budget、queue 和 storage budget；
- 同一来源遵守实时与历史请求的合并速率限制；
- 支持 pause、resume、cancel、retry、replay；
- 默认写入 private review 数据，不自动进入 public snapshot。

### 3.3 公平调度

建议初始预算：实时 lane 保留不少于 70% 的网络/worker 配额，backfill 最多使用剩余资源；具体值需通过运行基线校准。出现实时 backlog、429、上游异常或数据库压力时，backfill 自动降速或暂停。

## 4. Backfill 状态机

```text
planned -> acquiring -> normalizing -> clustering -> reviewing
   |           |             |             |           |
   v           v             v             v           v
cancelled    paused        failed        failed      approved
                                                     |
                                                     v
                                                  published
```

每个 `BackfillRun` 保存：

- source、month、policy/adapter/schema version；
- checkpoint before/after；
- fetched/document/observation/signal/event counts；
- duplicate/conflict/review/reject counts；
- request、bytes、retry、error 和耗时；
- started/finished、operator 和状态转换审计。

失败不得推进 checkpoint。重试使用相同 idempotency key，不重复创建 Document 或 Observation。

## 5. 领域分层

### 5.1 Document

代表一份独立公开材料，例如官方公告、论文、release、监管文件、财报或帖子。

关键字段：

- canonical URL、content hash、document type；
- title、author/publisher identity、language；
- published/updated time 与 time precision；
- sanitized excerpt/metadata，不保存无授权全文；
- archive URL、license/policy、availability；
- schema/adapter version。

### 5.2 SourceObservation

代表某个来源在某时刻观察、引用或传播 Document/Event，保存平台、作者、互动、地域和 observedAt。同一 Document 可以有多个 Observation。

聚合站条目只创建 discovery Observation；找到 original URL 后关联 Document，不能直接成为 primary fact Document。

### 5.3 Signal

对 Document/Observation 的规范化情报输入，包含 content role、category、entities、metrics 和 provenance。

### 5.4 Claim / Evidence

Claim 是可验证的最小事实陈述。Evidence 保存 supporting、verifying、contradicting、context 或 heat 角色及相关度。历史重大数字应以 claim 级 evidence 发布。

### 5.5 Event

Event 是多个相关 Claim/Signal 收敛后的唯一事实节点。Event 保存当时视角、回看验证、评分状态、修订版本和审核状态。

## 6. 建议数据模型

以下是目标增量，具体 migration 需单独评审 SQLite/MySQL 共有语义。

### backfill_runs

- id、source_id、period_start/end、lane、status；
- checkpoint_before/after、policy_version、adapter_version；
- counts_json、diagnostics_json、started/finished、operator。

### documents

- id、canonical_url/hash、content_hash、document_type；
- publisher_identity_id、author_identity_id、language；
- title、excerpt、published_at、updated_at、time_precision；
- archive_url、availability、policy_json、schema_version。

### source_observations

- id、document_id/event_id、source_id、author_identity_id；
- observed_at、platform、region、language、metrics_json；
- discovery_role、aggregator_url、original_url、provenance_json。

### claims / claim_evidence

- claim text、subject/predicate/object、as_of、confidence、status；
- evidence document/signal、role、relevance、quote locator、verified_at。

### event_versions

- event_id、version、content_json、changed_fields、change_reason；
- policy/model/prompt version、reviewer、created_at。

### period_summaries

- track_id、period type/month/quarter/year/two-year；
- period_start/end、as_of、status、summary sections；
- key_event_ids、evidence_gap_json、version、reviewer。

### publish_snapshots

- id、schema_version、policy_version、content_hash、status；
- previous_snapshot_id、diff_json、approved_by/at、published_at；
- manifest_path、artifact_id、rollback metadata。

## 7. 时间模型

```text
occurredAt   事件实际发生
publishedAt  来源首次公开
observedAt   系统看到
verifiedAt   编辑核验
asOf         判断使用的信息截止点
```

- 排序优先 occurredAt；无法精确时使用 range/month 并展示精度；
- 不用 collectedAt 代替历史发布时间；
- 来源只给相对时间时，保存原值、解析基准和置信度；
- 文档后来修改时保留首次发布和更新时间；
- 回看验证不得写回当时视角字段，而是创建新 EventVersion。

## 8. 获取与 archive 策略

优先级：

1. 官方 archive/API/RSS/Atom/release/filing；
2. 官方 sitemap、分页索引或稳定 metadata；
3. 论文/监管/交易所等公共权威索引；
4. 聚合站或专业媒体用于发现遗漏；
5. 合法公共 Web Archive 仅用于恢复已消失原始页面，并明确 archive 身份；
6. 需要登录、cookie、验证码或高风险逆向的来源不做自动回填。

每个 source manifest 需增加：

- `historicalFrom` / `historicalTo`；
- `archiveStrategy` 与 pagination/cursor；
- `historicalRateLimit`；
- `dateSemantics`；
- `contentAvailability`；
- `archivePolicyReviewedAt`；
- `backfillEnabled` 和预算。

## 9. 回源与 provenance

```text
Aggregator / media discovery
            |
            v
       original URL resolver
            |
     +------+-------+
     |              |
 verified       broken/restricted
     |              |
 Document       review/gap record
     |
 Claim Evidence
```

- URL resolver 验证 redirect、canonical、publisher domain 和文档身份；
- archived copy 与原始 URL 同时保存，archive 不冒充 original；
- 多家媒体引用同一公告只增加 verification/context，不增加 primary count；
- 同媒体集团和同作者跨平台转发按 identity graph 去重；
- 无法回源的聚合候选进入 evidence gap，不进入公开事实。

## 10. 文档去重

处理顺序：

1. URL canonicalization；
2. canonical URL hash exact match；
3. content hash exact/near duplicate；
4. publisher + external ID；
5. translation/repost detector；
6. 人工冲突处理。

不能因 URL 去重而丢失传播观察：Document 唯一，Observation 保留。

## 11. Event 聚类

候选特征：

- Actor/entity aliases；
- claim overlap，而不只是标题 token；
- document citation/root source；
- event type 和产品/model version；
- occurred/published time window；
- multilingual semantic similarity；
- contradiction 和 correction signal。

边界规则：

- 首发、价格变化、开放 API、企业分发和独立复现通常是不同节点；
- 同一发布的多语言公告和媒体转载是同一节点；
- rumor、确认、撤回保留版本关系，不强行覆盖；
- 自动聚类只生成 candidate，历史发布必须人审；
- merge/split 保存 source event IDs、目标 IDs、理由和策略版本。

## 12. 主线与阶段模型

`event_tracks` 需要承载：

- track、stage、node role、order；
- narrative 与该视角的 why-it-matters；
- predecessor/successor；
- cause、enables、competes、contradicts、validates、supersedes 等关系；
- China benchmark actor/event 和 progress stage。

阶段不只由季度机械切分。季度是发布/复核窗口，真正阶段由共同问题、路线和转折定义；管理员可调整边界，但必须保留版本和理由。

## 13. 阶段总结生成

```text
approved Events in Track + prior Phase + evidence gaps
                        |
                        v
             deterministic outline builder
                        |
            optional LLM structured draft
                        |
      evidence validator / contradiction checker
                        |
                   human review
                        |
               versioned PeriodSummary
```

门禁：

- 总结中每个事实句映射 Claim/Event；
- 推断句显式标注 inference；
- 不能引用 review/rejected Event；
- 关键节点不足时输出 evidence gap，不生成空泛趋势；
- LLM 输出需保存 model/prompt/input refs，且不能绕过人审；
- 修改历史阶段结论必须生成新版本和 changelog。

## 14. 评分与后见偏差

保存两组视角：

- `asOfScore`：基于当时证据计算；
- `retrospectiveAssessment`：后来验证后的定性/量化评估。

历史 heat 缺失时不补默认分。`observed`、`reconstructed`、`unknown` 三类不能直接混排。页面默认按主线重要性和时间排序，并显示评分数据质量。

## 15. 连续发布

### 15.1 Snapshot 内容

```text
dist/
  index.html
  assets/
  data/
    manifest.json
    current.json
    timeline/index.json
    timeline/2024-07.json ... timeline/2026-07.json
    tracks/index.json
    tracks/<track>/<period>.json
    summaries/<track>/<period>.json
    actors/index.json
    resources.json
```

目录是目标设计，尚未实现。分片大小和层级要通过静态站性能验收后冻结。

### 15.2 发布状态机

```text
draft snapshot -> validating -> preview -> approved -> publishing -> published
                       |                         |             |
                       v                         v             v
                     failed                   failed       superseded
```

质量门禁包括 evidence、schema、privacy、broken link、duplicate、track coverage、summary citations、browser smoke 和 artifact hash。

### 15.3 原子切换与回滚

- 数据分片先上传，最后切换 manifest/current pointer；
- 当前 snapshot 失败不影响上一 published snapshot；
- rollback 只切 pointer，不重写历史数据；
- Event slug/ID 稳定；撤回发布 tombstone；
- snapshot diff 明确 added、updated、merged、split、withdrawn。

GitHub Pages 的具体原子语义需要通过 Actions/artifact 实测，不能只按设计宣称完成。

## 16. 可观测性

### Backfill

- source-month completion、lag、throughput、bytes、cost；
- empty、duplicate、date-error、contract-drift；
- original resolution、archive availability；
- cluster candidate、false merge correction、review backlog。

### Coverage

- track x quarter x region x source tier；
- catalog coverage vs effective observation；
- covered/sparse/evidence_gap；
- Actor、产品、政策和商业化缺口。

### Publish

- snapshot validation/publish duration；
- shard count/size、first load、cache hit；
- broken evidence link、schema/privacy failure；
- rollback time 和 current/artifact hash 一致性。

## 17. 性能与容量

- backfill 查询必须按 source/period 使用索引；
- 聚类按月/Actor 候选集分桶，避免全库 O(n²)；
- static export 增量生成受影响 shards，不必每次重写全量；
- 前端首屏只加载 current、track index 和最近分片；
- 历史搜索可使用预生成轻量索引；
- 运行测试需覆盖 10 万、50 万 Observation 与 1 万 Event 量级，再决定是否引入专用搜索/向量存储。

## 18. 安全与许可

- 不保存或导出无授权完整正文；
- raw fetch 仅在许可允许时短期隔离保存，用于 parser debug，并设置 TTL；
- archive 来源记录归属和获取日期；
- 外部 URL 逐跳 SSRF 检查，历史批次不放宽安全策略；
- backfill 任务不能读取管理 token 或任意本机文件；
- 管理操作、Event 修订、snapshot 批准与回滚保留审计；
- PriceAI 等受限数据不进入历史回填，除非获得明确授权。

## 19. 实施顺序

1. coverage/source archive manifest；
2. backfill run/checkpoint 与 realtime 隔离；
3. Document/Observation 与时间模型；
4. provenance/identity/document dedupe；
5. claim/event clustering 和 review workbench；
6. Track phase 与 PeriodSummary；
7. snapshot/shards/preview/diff/rollback；
8. 逐批回填与质量校准；
9. 两年 synthesis 与长期持续发布。

不得先批量抓取再补治理，否则错误时间、重复、许可和事实边界会放大为不可修复的数据债务。
