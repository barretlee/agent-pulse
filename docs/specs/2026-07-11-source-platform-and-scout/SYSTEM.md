# 数据源平台与星探精灵系统设计

- 状态：Stage 2 foundation 已实现，完整 Source Platform 仍在演进
- 说明：带有“建议/目标”的部分不代表当前仓库已经实现

## 1. 总体架构

```text
                         Source discovery
                  coverage gaps / backlinks / curator
                                   |
                                   v
 Source control plane       Candidate registry
 manifest / policy / owner -> draft -> shadow -> active
                                   |          |
                                   |          +-> scheduler / budgets
                                   v
                         Adapter runtime sandbox
                   fetch -> validate -> normalize -> persist
                         |              |
                         |              +-> cursor/cache state
                         v
 Evidence plane       signals -> provenance -> entities
                         |             |
                         +-> dedupe / cross-language cluster
                                       |
                                       v
 Intelligence plane       facts / conflicts / scores / tracks
                                       |
                         +-------------+-------------+
                         |                           |
                         v                           v
 Curator control room  reviewed events          Scout engine
                         |                     opportunity cards
                         v                           |
                  versioned snapshot          private feedback loop
                         |
                         v
                   static public site
```

控制面、证据面、认知面和公开面必须隔离。原始 payload、密钥、内部错误和星探私有偏好不得进入静态输出。

## 2. 模块边界

建议在现有目录上渐进扩展：

```text
src/
  sources/
    catalog/          source registry and coverage map
    discovery/        candidate discovery and prioritization
    lifecycle/        promotion, degradation and uninstall
    runtime/          scheduler, budgets, circuit breaker
  collectors/
    contracts/        adapter interfaces and schemas
    adapters/         source-specific implementations
    fixtures/         redacted golden responses
  evidence/
    provenance/       source, author, media-group lineage
    entities/         actor/entity aliases and resolution
  pipeline/
    collect/          fetch, normalize, idempotent persistence
    cluster/          cross-source/cross-language event grouping
    curate/           fact, conflict, insight and review workflow
    publish/          versioned privacy-safe snapshots
  scout/
    generate/         evidence-grounded candidates
    rank/             novelty/actionability/fit/timing
    feedback/         owner preferences and outcome learning
  server/
    admin/            control-plane API
    public/           reviewed read-only API
```

编排依赖端口和领域服务，不依赖具体来源。source-specific 规则只能存在于 adapter/source package 内。

## 3. Source Package 契约

### 3.1 Manifest

```ts
interface SourceManifest {
  id: string;
  version: string;
  adapterKind: string;
  capabilities: Array<"etag" | "last-modified" | "cursor" | "fingerprint" | "backfill">;
  acquisition: "api" | "rss" | "atom" | "release" | "html-metadata";
  defaultSchedule: string;
  rateLimit: { requests: number; windowMs: number; minIntervalMs?: number };
  policy: {
    robotsReviewedAt: string;
    licenseUrl?: string;
    attributionRequired: boolean;
    storesFullText: false;
  };
}
```

manifest 不保存 token。敏感配置只通过环境变量或独立 secret provider 注入。

### 3.2 Adapter

```ts
interface SourceAdapter<TConfig, TState> {
  manifest: SourceManifest;
  configSchema: Schema<TConfig>;
  stateSchema: Schema<TState>;
  probe(ctx: ProbeContext<TConfig>): Promise<ProbeResult>;
  collect(ctx: CollectContext<TConfig, TState>): Promise<CollectResult<TState>>;
}

interface CollectResult<TState> {
  signals: CollectedSignal[];
  nextState: TState;
  diagnostics: CollectDiagnostics;
}
```

`nextState` 只在 signals 与运行记录成功提交后原子更新，避免失败时丢失 cursor。

### 3.3 规范化信号

除现有标题、URL、摘要、作者、语言、时间、标签和 metrics 外，至少增加：

- `sourceUrl`：本次获取端点；
- `originalUrl`：事实/帖子/论文的原始地址；
- `aggregatorUrl`：若由聚合站发现，保留聚合页；
- `authorIdentity` / `mediaGroupIdentity`；
- `contentRole`：fact、verification、interpretation、heat；
- `observedAt` 与原始发布时间可信等级；
- `schemaVersion` 与 `adapterVersion`；
- `provenanceChain`：发现源到原始源的链路。

## 4. 生命周期状态机

```text
discovered --review--> draft --contract+policy--> shadow --SLO--> active
     |                    |                         |              |
     v                    v                         v              v
 rejected              retired                  rejected      degraded
                                                                 |
                                                    risk/drift -> quarantined
                                                                 |
                                                    operator  -> retired
```

所有转换写入 append-only audit log：from、to、reason、evidence、actor、timestamp。

### 晋级建议阈值

阈值应可配置，初始建议：

- shadow 至少跨 7 天或 20 次计划运行；
- 请求成功率 >= 98%；
- 解析成功率 >= 97%；
- 异常空结果率 <= 5%；
- 原始 URL 可回源率：事实型来源 100%，聚合型来源 >= 90%；
- 重复率和发布时间异常在预期范围；
- 人工抽检至少 30 条，无严重 tier/role 错判。

达到阈值只是晋级建议，仍需人审。

## 5. 调度、重试与降级

### 5.1 调度

- scheduler 根据 source schedule、priority、quota、cost 和 nextRunAt 生成 source run；
- global、domain 和 source 三层并发/速率预算；
- 同一 source 同一窗口只允许一个 active lease；
- backfill 与 realtime 队列隔离，避免历史任务阻塞热点采集。

### 5.2 请求策略

- 连接和总请求 timeout 分开配置；
- 仅对网络错误、408、429 和可恢复 5xx 做有限重试；
- 指数 backoff + full jitter，并遵守 `Retry-After`；
- 非幂等请求默认不重试；当前公开来源原则上只使用 GET；
- 流式读取响应，超过 body limit 立即中止；
- 每次 redirect 重新解析 URL、DNS 并执行 SSRF policy；
- response content-type、编码和 schema 必须校验。

### 5.3 熔断与恢复

- transient failure、auth、rate-limit、schema-drift、policy、安全风险分别分类；
- 连续失败或失败率超阈值进入 `degraded`，指数拉长 schedule；
- schema 漂移、许可变化或安全风险进入 `quarantined`，停止进入事实链；
- half-open 只执行 probe/shadow verification；成功达到恢复门槛后才能 active；
- 可配置 fallback source，但必须保留来源层级，不能把聚合源自动提升为事实源。

## 6. Provenance 与聚合站回源

```text
Aggregator item --discovered--> Original post/blog/paper/release
       |                                  |
       | heat/cluster hint                | fact evidence
       +----------------------------------+
```

- aggregator signal 的 `contentRole` 固定为 discovery/heat，不能自动变为 primary fact；
- 回源任务解析 aggregator 提供的原始 URL，并对重定向、canonical 和域名归属做验证；
- 事实确认优先使用公司公告、论文、监管文件、官方 release；
- aggregator 无法回源时，事件只能停留在 candidate/review；
- 聚合站自身的作者数/帖子数可以作为热度指标，但不能增加事实独立来源数；
- 独立来源按 source identity、author identity、media group 和引用链去重。

## 7. 数据模型增量

建议新增或扩展以下表。字段以目标语义为准，具体 migration 需单独评审 SQLite/MySQL 共有能力。

### sources 扩展

- lifecycle、owner、adapter_version、manifest_json；
- acquisition、schedule、priority、quota_json、policy_json；
- failure_streak、circuit_state、next_run_at、health_score；
- promoted_at、degraded_at、quarantined_at。

### source_discoveries（已有基础表，后续扩展）

- 当前保存 aggregator source、discovery URL、origin URL、原始身份线索、匹配 source/signal 和处理状态；
- 后续增加 discovered_by、actor_id、coverage_dimensions_json、candidate_scores_json；
- 后续补 review_reason、promotion evidence 和独立 audit relation。

### source_runs

- source_id、adapter_version、lease_id；
- scheduled_at、started_at、finished_at、status；
- request/retry/item/new/duplicate/error counts；
- cursor_before/after、etag_before/after、diagnostics_json。

### source_audits

- source_id、transition、actor、reason、evidence_json、created_at。

### identities / source_identities

- author、organization、media group、aliases 和关系，用于独立性计算。

### scout_insights / scout_evidence（已有基础表，后续扩展）

- 当前保存机会卡正文、类型、状态、受众、时间跨度、评分、cooldown key 和 Event evidence；
- 后续增加 track_ids、non_consensus、risk/invalidators、first_experiment 结构化字段；
- 后续增加 score_factors_json、model_run_id、owner_feedback 和 snoozed_until。

### model_runs

- purpose、provider、model、prompt_version、input_refs、output_hash、review_status；
- 不存储 secret，不把私有 prompt/input 导出到公开站。

## 8. 来源质量与覆盖评分

来源分数不与事件热度混用：

```text
sourceQuality = accuracy + originality + freshness + stability
              + incrementalCoverage + identityConfidence
              - policyRisk - duplication - driftPenalty
```

coverage cube 至少包含：

- 地区：中国、美国、欧洲、其他；
- 角色：厂商、实验室、论文、监管、投资、媒体、专家、社区；
- 主线：技术、AGI、资本、商业化、To C/B/D/G；
- 传播域：官网、论文、GitHub、X、微信、微博、知乎、社区；
- 语言：中文、英文及后续重点语言。

管理台应显示“名单覆盖”和“近 30 天有效信号覆盖”两套指标。

## 9. 星探流水线

```text
reviewed events + track deltas + owner profile + prior opportunities
                             |
                             v
                      candidate generation
                             |
             evidence check / safety / dedupe
                             |
                             v
 ranking: novelty / actionability / fit / timing / evidence
                             |
                             v
                  private opportunity inbox
                             |
              accept / save / snooze / reject / outcome
                             |
                             v
                     preference calibration
```

### 生成约束

- 输入只能引用 reviewed/published 事件；
- 每条 claim 必须标记来自 evidence 还是 inference；
- 单一聚合信号不得生成高 evidence strength 机会；
- 同一 event/track/time window 做语义去重和数量上限；
- 生成失败不得影响主采集/发布流水线。

### 排名

- novelty：与既有机会和常识模板的差异；
- actionability：是否能转成清晰的小实验；
- owner fit：与主人能力、兴趣和资源的匹配；
- timing：窗口是否正在形成且有验证节点；
- evidence strength：触发事实与反证的质量。

分数必须保存因子，不只保存总分。

## 10. 发布与回滚

- 管理台发布生成不可变 snapshot，而不是直接覆盖当前公开数据；
- snapshot 保存 schema version、content hash、event/source versions、generatedAt 和审核人；
- 预览读取 candidate snapshot；正式 Pages 只读取 approved snapshot；
- GitHub Actions 获取经过批准的 privacy-safe snapshot 或仓库内公开快照，不重新生成手工 seed 代替运营数据；
- 回滚只切换 snapshot pointer，不修改历史证据；
- Scout 默认 private，除非单卡经过独立审核并转换成公开 insight。

## 11. 可观测性与 SLO

至少提供：

- source success、latency、freshness、empty、duplicate、drift、backlog；
- 每层覆盖率和近 30 天活跃来源数；
- 回源成功率、聚类人工纠正率、事实审核退回率；
- snapshot 发布成功率和回滚耗时；
- Scout 接受/收藏/暂缓/驳回率、实验转化率和重复率。

初期不承诺绝对 SLO，先观测 2–4 周建立 baseline，再冻结告警阈值。

## 12. 演进边界

```text
Stage 1  可演示骨架（当前）
Stage 2  可信数据底座：source lifecycle + provenance + publish loop
Stage 3  行业认知引擎：跨语种聚类 + 事实/判断 + Scout v1
Stage 4  自适应机会系统：coverage discovery + feedback calibration
Stage 5  受治理的战略认知 OS：观察 -> 判断 -> 行动 -> 复盘
```

自我生长只能通过 proposal/spec、测试、shadow verification、人审和 rollout 完成。系统不得自主绕过合规边界，或静默改变事实、排名和发布规则。
