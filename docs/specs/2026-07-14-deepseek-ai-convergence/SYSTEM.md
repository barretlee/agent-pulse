# SYSTEM：DeepSeek AI 事件收敛与自动发布闭环

## 1. 当前与目标差异

```text
当前：Signal -> deterministic cluster -> placeholder Event -> blocked forever

目标：Signal -> deterministic cluster -> eligible review Event
                                      -> DeepSeek structured draft
                                      -> local validation
                                      -> deterministic readiness
                                      -> auto-publish or keep review
```

## 2. 边界

### 输入 allowlist

- Event id、标题、发生时间、现有分类和实体；
- 最多 6 条已绑定 Evidence 的标题、裁剪摘要、来源、tier/role、发布时间和 canonical URL；
- 当前启用的 Track slug、名称与描述。

不发送原始 collector payload、数据库 URL、管理字段、token、cookie、本机路径或来源完整正文。

### 输出 Schema

- `factSummary`
- `summary`
- `technicalInsight`
- `industryInsight`
- `futureOutlook`
- `businessValue`
- `company`
- `category`
- `keywords`
- `trackSlugs`
- `usedEvidenceUrls`

所有 URL 必须来自输入 Evidence；Track 必须来自已有目录；输出不得含占位词。

## 3. 候选门禁

只选择 `review` Event，并要求：

- 已绑定 Evidence；
- 至少一个非 aggregator Tier 1 Evidence；
- 不存在 `missing_evidence`、`missing_primary_evidence` 或 `unsupported_heat`；
- 阻塞项属于 AI 可修复的内容/分类/Track 范围；
- 单轮数量不超过 `AI_ENRICHMENT_MAX_EVENTS`。

AI 不改变 confidence/heat/impact/value；这些分数继续来自确定性评分。

## 4. DeepSeek 客户端

- Base URL：`https://api.deepseek.com`
- Model：`deepseek-v4-flash`
- Endpoint：`POST /chat/completions`
- `response_format={"type":"json_object"}`
- thinking disabled
- timeout、有限 retry、`Retry-After` 和指数 backoff + jitter
- 日志只输出状态、Event id、模型、Token 数与安全错误分类

## 5. 配置

```text
DEEPSEEK_API_KEY            secret; optional unless AI is enabled
DEEPSEEK_BASE_URL           default https://api.deepseek.com
DEEPSEEK_MODEL              default deepseek-v4-flash
AI_ENRICHMENT_ENABLED       default false
AI_ENRICHMENT_MAX_EVENTS    default 8
AI_ENRICHMENT_TIMEOUT_MS    default 60000
```

本地 `loadConfig()` 读取被 gitignore 的 `.env`；CI 通过 `${{ secrets.DEEPSEEK_API_KEY }}` 注入。

## 6. 失败与回滚

- 单 Event 超时、429、5xx、非法 JSON 或校验失败：保留原 Event，继续下一个。
- 全部尝试失败且启用 `--require-success`：命令非零退出；Actions 记录 warning 与机器证据，Event 保持 review，但确定性采集增量继续写入快照。显式本地验证仍可使用该非零状态作为硬失败。
- 无候选：成功退出，不调用模型。
- 回滚：设置 `AI_ENRICHMENT_ENABLED=false` 或移除 workflow step；最后成功快照和 Pages 保持可用。
- 模型输出应用前保存内存中的旧值；数据库更新与 Track 绑定在事务中完成。

## 7. GitHub Actions

```text
restore snapshot
 -> collect + deterministic cluster
 -> source reconciliation
 -> AI enrich eligible review Events
 -> deterministic auto-publish
 -> evaluate
 -> merge origin/main snapshot
 -> export + snapshot write
 -> commit/rebase/push
 -> Pages dispatch
 -> optional AI weekly brief
```

模型密钥只存在于 enrichment step 的环境，不设置为 job 级环境，减少暴露面。

## 8. AI 周报

周报输入只来自 `dist/data/timeline.json`、`scout.json` 和 `product.json`。本地先按 Asia/Shanghai ISO 周过滤，再把最多 8 个公开 Event、6 个 Scout 建议和覆盖指标交给模型。

模型返回严格 JSON：

- `headline`、`executiveSummary`
- `thesisChanges[]`：Event slug、变化、重要性、影响对象、决策含义、下一信号
- `decisionCards[]`：角色、动作、48 小时第一步、停止条件、Event slugs
- `uncertainties[]`：待验证问题、当前证据边界、下一信号、Event slugs
- `watchlist[]`：观察项、触发条件、Event slugs

所有 slug 必须来自本周输入；Markdown 链接、编号、折叠区和 HTML 转义由确定性 renderer 生成。结构校验失败时允许一次只修结构、不新增事实的有界重试。AI 仍失败时不更新周报 Issue，保留上一版并记录安全 warning；已经完成的 snapshot push 与 Pages dispatch 不回滚。
