# 系统设计

## 现状到目标的差异

```text
Current
  Python regex collectors -> new_items.json -> manual entries.json -> index.html

Target
  Source registry
      -> adapters (API / RSS / JSON / HTML metadata)
      -> normalized signals
      -> URL/content dedupe
      -> event clustering
      -> credibility + heat + impact scoring
      -> curation / admin review
      -> privacy-safe static export
      -> GitHub Pages
```

## 模块边界

```text
src/
  config/       environment and validated settings
  db/           Kysely connection, migrations, repositories
  domain/       source, signal, event types and pure scoring rules
  collectors/   SourceAdapter implementations and fetch safety
  pipeline/     collect, normalize, dedupe, cluster, curate, export
  server/       Fastify public/admin APIs and static assets
  cli/          migration, seed, collect, export commands
web/
  public/       static timeline app
  admin/        local/server-side admin app
```

Orchestration depends on ports, never on a concrete collector or database driver.

## 数据库兼容策略

Kysely 提供统一查询层：

- 默认：`better-sqlite3`，数据库位于 `var/agent-pulse.db`。
- 可选：`mysql2`，通过 `DATABASE_URL=mysql://...` 启用。
- migration 只使用两者共有的数据类型与索引能力。
- JSON 以 text 存储并在 repository 边界校验，避免 SQLite/MySQL JSON 行为差异。
- boolean 以 integer 0/1 存储。
- 时间统一存 ISO-8601 UTC text。

## 核心表

- `sources`：来源注册、层级、评分、地区、适配器配置、健康状态。
- `signals`：规范化原始元数据、URL、摘要、发布时间、互动指标、内容 hash。
- `events`：收敛后的公开事件、各维评分、审核状态、置顶和主题。
- `event_signals`：事件与证据关联、证据角色和关联置信度。
- `jobs`：流水线任务状态、计数、错误和耗时。
- `settings`：非敏感产品配置；密钥永远只来自环境变量。
- `tracks` / `event_tracks`：主线、支线、事件节点位置、里程碑和视角解释。
- `actors` / `event_actors`：国内外公司、机构、人物与事件关系，以及追赶阶段。
- `model_resources`：官方模型购买/API 资源和第三方参考入口。
- `views`：后台编排的公开视图定义，包含筛选、区块、布局与主题 token。

## 多维叙事模型

```text
                         +-> 技术支线 / 分类 / 模态
Event -> primary Track --+-> AGI / 投资 / 商业化主线
      -> Actors ---------+-> 国内 vs 海外 / 跟随 vs 并跑 vs 领先
      -> Audiences ------+-> To C / To B / To D / To G
      -> Resources ------+-> 能力如何购买、单位成本和风险边界
```

事件是唯一事实节点；主线和视图只改变解释与编排，不复制事件内容。这样同一发布可以同时成为“推理技术节点”“To D 商业化节点”和“中国追赶对标节点”。

## 来源分层

### Tier 1：一手事实

公司公告、官方博客、论文原文、监管文件、官方 GitHub release。默认可信度 85-100，决定“是否发生”。

### Tier 2：专业验证

权威媒体、研究机构、投资机构研究、专业记者。默认可信度 65-85，补充背景与独立验证。

### Tier 3：专家洞察

学者、CXO、工程师、技术博主、newsletter。默认可信度 50-80，提供解释，不单独确认重大事实。

### Tier 4：扩散信号

X、微博、知乎、Reddit、Hacker News、GitHub trend 等。默认可信度 20-60，主要计算传播而不是事实。

### Aggregator：发现源

AI HOT、HuggingNews 等。用于候选发现、聚类和热度交叉验证。必须回链到其原始来源，不能作为唯一证据。

## 统一适配器

```ts
interface SourceAdapter {
  kind: AdapterKind;
  collect(source: Source, context: CollectContext): Promise<CollectedSignal[]>;
}
```

所有适配器输出同一结构：标题、URL、来源内 ID、发布时间、摘要、作者、语言、互动量和上游证据 URL。ETag、Last-Modified、cursor 和 fingerprint 放入 source state。

## 去重与聚类

1. URL canonicalization 去除 tracking 参数、fragment 和尾斜杠差异。
2. `sha256(canonicalUrl)` 做强去重。
3. 规范化标题 token 的 Jaccard + 时间窗口做事件候选。
4. 实体/关键词重合提高相关度；相互冲突的版本保留为不同 signal。
5. 管理台可以合并/拆分事件，覆盖自动决策。

## 评分

```text
confidence = sourceAuthority + corroboration + primaryEvidence - conflictPenalty
heat       = uniqueAuthors + independentSources + platformBreadth
             + regionBreadth + velocity + persistence - repostPenalty
impact     = technicalShift + marketReach + strategicChange + businessActionability
value      = 0.30 confidence + 0.30 impact + 0.25 heat + 0.15 freshness
```

所有子分数为 0-100，保存最终分数和解释因子。自动分数可由管理员覆盖，但保留覆盖标记。

## 静态发布

`npm run export` 只读取 `published` 事件，输出：

- `dist/index.html`
- `dist/assets/*`
- `dist/data/timeline.json`
- `dist/data/tracks.json`
- `dist/data/actors.json`
- `dist/data/resources.json`
- `dist/data/view.json`
- `dist/404.html`

导出器使用 allowlist DTO，不复制数据库行，因此不会带出内部备注、任务错误、适配器状态、token 或本机路径。

公开目录保持四层以内：`index.html`、`assets/`、`data/` 和可选 `docs/`，不把服务端源码结构投射到 dist。

## 安全

- 外部请求设置超时、响应体上限、显式 UA 和有限重试。
- URL 只允许 HTTP(S)，DNS/IP 检查阻止 loopback、link-local 和 RFC1918 SSRF。
- 管理写接口使用 bearer token 常量时间比较；production 无 token 时拒绝启动管理写能力。
- API 输入用 Zod 校验，SQL 只通过 Kysely 参数化查询。
- CSP、`nosniff`、frame deny、严格 referrer policy。
- 日志不打印环境变量、token、完整响应体或 cookie。

## 稳定性和性能

- 单来源失败不影响整批任务；job 记录成功/失败计数。
- collector 并发有上限，每个 source 有 timeout。
- SQLite 开启 WAL；常用时间、状态、hash 字段建索引。
- Timeline 静态 JSON 带 schema version，前端可缓存并兼容回退。
- 聚类和评分核心为纯函数，便于单测和未来替换为向量/LLM。

## 回滚

- 原始 `data/entries.json` 保留为 legacy import fixture，不进入公开 dist。
- schema migration 前备份 SQLite 文件。
- 公共站点由 GitHub Pages artifact 发布，可回滚到历史 workflow artifact/commit。
- Collector 新增默认 disabled，验证成功后再启用。
