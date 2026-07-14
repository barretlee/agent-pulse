# TEST：DeepSeek AI 事件收敛与自动发布闭环

## 1. 单元测试

- API 请求使用 `deepseek-v4-flash`、JSON Output、thinking disabled，Authorization 不进入错误文本。
- 429/5xx 有限 retry，4xx 认证失败不重试。
- 非 JSON、截断 JSON、缺字段、占位词、未知 Track、未知 Evidence URL 被拒绝。
- 缐少 key 时只有显式启用命令失败，普通测试/export 不受影响。
- 无一手 Evidence、unsupported heat 和非 review Event 不进入 AI 候选。
- 合法输出在事务中更新 Event 与 Track，随后通过 readiness；非法输出不产生部分写入。
- AI 周报中的未知 Event slug、空决策、占位词或越界数组被拒绝。
- 周报模型只返回 JSON，最终 Markdown 中的链接由本地 renderer 从 slug 构造。
- 周报结构失败最多修复重试一次；二次失败保留旧 Issue，但不阻断确定性 snapshot 回流。

## 2. 本地真实 API

使用被忽略的 `.env`：

```bash
npm run ai:enrich -- --dry-run --max-events=1 --require-success
npm run weekly:issue -- --ai --require-success --timeline dist/data/timeline.json --scout dist/data/scout.json --product dist/data/product.json --end-date 2026-07-19
```

断言：请求成功、Schema 通过、Token 计数非负、stdout/stderr 不出现 key、prompt 或完整 response。

随后用临时 SQLite：

```text
snapshot restore -> AI enrich one candidate -> auto-publish -> export
```

## 3. 仓库门禁

- `npm run check`
- `npm run build`
- `git diff --check`
- 搜索仓库和 git diff，确认无 secret 形态与本机 `.env`
- workflow 契约确认 enrichment 位于 collect 后、auto-publish 前，且使用 Actions Secret

## 4. GitHub Actions 与线上

- 设置 `DEEPSEEK_API_KEY` Actions Secret；
- 分支 CI 成功；
- 合入 main 后手动触发一次 Data Refresh；
- 日志显示候选/成功/失败/Token 汇总，不显示输入输出正文；
- bot 快照提交成功，Pages workflow 成功；
- AI enrichment 或 weekly 失败时保留 warning/artifact，已完成的确定性增量仍能写回仓库；
- 线上 `signals.json`、`timeline.json` 的 generatedAt 更新；
- 若有合格 Event，Event 页面可打开并回链 Evidence；若无合格 Event，运行仍应明确报告 `candidates=0` 或阻塞原因。
- 使用同一公开 DTO 真实更新 Issue #13，检查核心判断、角色决策、停止条件和观察清单。
