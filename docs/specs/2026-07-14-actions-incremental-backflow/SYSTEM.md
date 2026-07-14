# SYSTEM：GitHub Actions 增量回流与 AI 失败隔离

## 1. 当前与目标差异

```text
当前
collect -> enrich -> evaluate -> merge/export -> weekly AI -> snapshot/write/push
                                                  X schema failure
                                                  -> increment lost

目标
collect -> enrich(advisory) -> evaluate -> merge/export
        -> snapshot/write/validate/commit/push -> Pages dispatch
        -> weekly AI(repair once, advisory) -> Issue only when valid
        -> always upload bounded evidence
```

## 2. Data Refresh 主链

主链按以下顺序执行：

1. restore repository snapshot；
2. incremental/backfill collect 与确定性 cluster；
3. source reconciliation、observation、activation contract；
4. AI Event enrichment，失败只影响对应 Event；
5. Scout、readiness/auto-publish、evaluation；
6. fetch `origin/main` 并 merge 最新 snapshot；
7. export converged public DTO 并计算 fingerprint；
8. write privacy-safe snapshot；
9. privacy/shape validation；
10. commit、rebase、push `main`；
11. dispatch Pages；
12. 按周日或显式输入尝试 AI weekly brief；
13. 仅合法且非空时 upsert weekly Issue；
14. `always()` 上传已有的机器证据并写 Step Summary。

AI enrichment 仍使用 `--require-success` 生成真实非零状态，但 workflow 只把该状态转为 warning 与 artifact；这样能区分“无候选”“部分成功”“系统性失败”，又不丢失确定性增量。

## 3. AI 周报结构化修复

第一次 completion 继续经过完整本地 Schema、slug allowlist 和占位词校验。失败后只允许一次修复调用，输入包括：

- 原 completion 的 JSON 值；
- 裁剪后的安全错误码；
- 原输出 Schema 和约束；
- 明确要求只修结构，不新增事实。

第二次仍不合法则抛出安全错误码。Workflow 捕获该单一命令状态，写入 `weekly-status.json` 和 warning，不创建或更新 Issue。原始 completion、prompt 和 response 不写日志或 artifact。

## 4. 机器证据

允许上传：

- `evaluation.json`
- `ai-enrichment.json`
- `weekly-status.json`

`weekly-status.json` 只包含 `status`、`attempted`、`published`、`errorCode`，不包含模型正文。artifact 使用 `if: always()` 和 `if-no-files-found: ignore`，因此它不能反向阻断数据主链。

三个 `.json` artifact 在上传前必须能被 `JSON.parse` 直接读取。CLI 通过 `npm run --silent` 执行，禁止把 npm banner 混入机器证据；AI enrichment 输出解析失败按可选 AI 失败隔离，系统评测输出解析失败则作为主链质量错误终止运行。

## 5. Monitor 口径

```text
effective = total - shadow - draft
activePercent   = active / effective
degradedPercent = degraded / effective
failedPercent   = (quarantined + retired) / effective
```

三项均 clamp 到 0–100；`effective=0` 时全部为 0。`active` 与 `degraded` 是互斥生命周期，禁止相减。
Monitor JSON 与告警文案必须使用 `activePercent` / `active` 表达生产生命周期覆盖；真实审计成功率单独使用 `auditHealthyPercent` / `healthy`，禁止混用。

## 6. 安全与回滚

- Secret 仍只注入对应 AI step。
- Workflow 捕获的错误码只保留字母、数字、下划线、冒号和连字符。
- 回滚 workflow 顺序不会回滚 snapshot schema；恢复旧 workflow 即可。
- 禁用 AI 时确定性 collect、snapshot、push 和 Pages 仍可运行。
- 若 snapshot privacy validation、commit/rebase/push 失败，主链必须失败，禁止把未回流数据描述为成功。
