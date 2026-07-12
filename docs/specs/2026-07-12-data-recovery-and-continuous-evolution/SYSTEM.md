# SYSTEM：数据恢复与持续进化

## 1. 当前事实

2026-07-12 第五轮正式库审计与第二轮进化后的水位：

```text
Source catalog                 195
  live source rows             196
  catalog canary                 6
  live active                    5
  quarantined canary             1

Source audit
  healthy                       68
  degraded                      28
  failed                        56
  manual/policy skipped         44
  accessible                   186
  fetched                      164
  with valid content            77

Live intelligence funnel
  signals                      637
  deferred                     533
  untriaged backlog              0
  events                        90
  review placeholders           46
  published events              44
  multi-source events            3
```

初始在途代码的 lint、后台初始化错误和“32 active / 117 verified”等过度声明已修正。当前仍不发布 0.5.0，必须等待 5 小时长跑、浏览器 smoke、CI/Pages 与最终全量回归完成。

## 2. 目标架构

```text
                         Source Catalog
                  identity / policy / endpoint
                              |
                              v
                  Probe & Qualification Plane
       access -> response -> parse -> schema -> sample quality
             -> duplicate -> freshness -> policy -> recommendation
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
      source_checks                         lifecycle review
   immutable diagnostics          draft/shadow/active/degraded/
                                  quarantined/retired
          |
          v
                     Collection Runtime
 scheduler -> domain budget -> fetch -> normalize -> dedupe -> persist
          |          |                       |
          |          +-> retry/cache         +-> SourceRun
          v
                     Intelligence Funnel
 Signal -> candidate cluster -> evidence gate -> editorial review -> publish
          |                  |                         |
          +-> loss reasons   +-> quality/claims       +-> snapshot
                                                           |
                                                           v
                                                    GitHub Pages

              Iteration evaluator reads every plane
        baseline -> delta -> regression -> next proposals
```

检查面与正式采集面分离：probe 可以覆盖全部目录，但不能写正式 Signal 或直接 active；collect 只运行经过治理的 active/degraded 来源。

## 3. Source Check 模型

新增 append-only `source_checks`：

- identity：id、source_id、job_id、adapter、adapter_version；
- timing：started_at、finished_at、duration_ms；
- access：status、http_status、final_url、content_type、response_bytes；
- extraction：item_count、latest_item_at、schema_status、parse_status；
- quality：quality_score、duplicate_ratio、freshness_hours、sample_titles；
- diagnosis：error_type、error_code、error_summary、proxy_hint；
- action：repair_action、retention_decision、recommended_lifecycle；
- governance：policy_status、robots_status、probe_mode。

公开快照只输出经过 allowlist 的聚合健康信息，不输出内部路径、代理地址、原始 payload 或错误堆栈。

## 4. 状态与动作

```text
catalog entry
  -> probe
     -> policy_blocked/manual/restricted : retain metadata, no fetch
     -> unreachable/transient            : retry queue, no retirement
     -> reachable but parse failed       : adapter repair/shadow
     -> parse success but low quality     : shadow/quarantine candidate
     -> qualified                         : shadow observation window
     -> SLO + human review                : active
```

一次 probe 成功只能证明当前可访问和可解析，不能证明稳定。自动动作允许 active→degraded、risk→quarantined；shadow→active 仍需要满足观察窗口和人工确认。

## 5. 适配器策略

### RSS / Atom

优先级最高。验证 feed content-type、entry 数、日期、canonical URL 和异常空结果。首页声明 feed 时可以发现候选 feed，但变更 endpoint 前保留审计。

### GitHub Releases

只针对明确 GitHub repository；使用 `releases.atom` 或官方 API。组织主页、用户页和非 repository URL 不得强行套用。

### Official JSON API

使用 source-specific schema 或经过配置验证的 mapping。通用 API 适配器只允许 shadow，响应 wrapper/字段映射必须留下诊断。

### HTML metadata

只提取 JSON-LD、明确 article/list item、canonical、date 和摘要 metadata，不保存完整正文。首页能返回 200 但没有文章结构时视为 `parse_empty`，不是成功。

### Social / manual / restricted

不能默认映射为 web scraper。没有公开稳定 API/RSS 时保持 restricted/manual，可记录替代官方来源和人工工作流。

### Proxy

代理只解决网络可达性，不解决合规和解析问题。系统记录 `proxy_hint`，代理 URL 仅来自环境变量且不得入库/日志/快照。直连失败后是否使用代理由显式配置控制；不绕过平台限制。

## 6. 去重与质量

三层去重：

1. canonical URL hash；
2. normalized title/content fingerprint；
3. 同实体、时间窗、事件类型的近重复候选。

质量分只用于排序和门禁，不替代事实审核。至少考虑 source authority、primary provenance、内容完整度、时间可信度、新鲜度、重复度和独立证据数。历史内容不能因旧而自动低质，freshness 要按任务模式区分 realtime/backfill。

## 7. 发布漏斗

每个 Event 记录 readiness reason：

- `missing_primary_evidence`
- `thin_fact`
- `placeholder_insight`
- `duplicate_candidate`
- `conflicting_claim`
- `low_confidence`
- `ready_for_review`
- `published`

自动聚类永远不直接 published。只有审核动作能改变公开状态；静态导出继续只读取 published。

## 8. 自进化循环

每轮创建 iteration artifact：

```text
iteration id / code version / policy version
baseline metrics
selected problem + expected impact
changes + tests + real-run ids
after metrics
regressions / unresolved risks
next ranked proposals
```

策略引擎只生成 proposal，不直接修改来源、schema、评分和发布规则。下一轮由执行 Agent 在规格和测试约束下选择最高价值 proposal。

## 9. 长跑与资源控制

- 一个长跑 supervisor 调度短 iteration，不持有 5 小时数据库事务；
- 每轮重新读取状态，使用 lease 防止与 GitHub Actions 重叠；
- source/domain/global 三层并发和速率预算；
- 每次等待不超过 10 分钟，持续输出心跳；
- SIGINT/SIGTERM 后完成当前来源并落盘 iteration checkpoint；
- backfill 与 realtime 分开，历史任务不能拖慢当天信号。

## 10. 回滚

- 新 migration 前备份 SQLite；MySQL 声明需独立集成验证；
- 新 adapter 先 shadow，可单源禁用；
- 来源检查记录 append-only，不覆盖历史；
- 管理台新页面失败不影响 collect/export；
- Pages 继续从最后成功仓库 snapshot 构建；
- 自动产生的 review Event 可以保留，不能自动公开。
