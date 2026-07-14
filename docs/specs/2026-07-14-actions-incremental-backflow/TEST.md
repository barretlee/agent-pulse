# TEST：GitHub Actions 增量回流与 AI 失败隔离

## 1. 单元测试

- 周报第一次返回未知 Event slug、缺字段或越界结构，第二次修复后成功。
- 修复调用累计两次 completion 的 Token 用量并报告 `repairAttempts=1`。
- 第二次仍非法时抛出安全错误码，不返回 Markdown。
- 不符合停止条件但其余合法的卡片继续使用确定性安全兜底。
- Monitor 在 `active < degraded` 时仍返回非负百分比；空有效来源返回 0。

## 2. Workflow 契约

- enrichment 非零状态被转换为 warning，而不是提前终止 job；
- `snapshot write < validate < git push < Pages dispatch < weekly render`；
- weekly failure 写安全状态且不进入 Issue upsert；
- quality evidence 使用 `if: always()`，三个 `.json` 文件都能被 `JSON.parse` 直接读取；
- CI 的 lint、typecheck、test、export、build 分步执行；
- data writers 继续共享 `agent-pulse-repository-data-main` 串行锁且没有 force push。

## 3. 本地验证

```bash
npm run check
npm run build
git diff --check
```

补充检查 workflow、snapshot 和 diff 中不存在 token、private key、本机路径或原始模型正文。

## 4. GitHub 闭环

1. 分支 CI 成功；
2. 合入 main；
3. 手动触发 `data-refresh.yml`，`mode=incremental`；
4. Data Refresh 成功；
5. 若数据变化，`github-actions[bot]` 产生新的 snapshot commit；若无变化，日志明确 `No material data changes`；
6. quality artifact 包含可直接解析的 JSON 证据；
7. Pages workflow 成功；
8. `data/snapshot/v1.json` 的 `generatedAt`/运行数据与公开 DTO 形成一致闭环；
9. 公开站 HTTP 200，目标 JSON 可读取。

## 5. 首轮真实验收证据

- PR CI：[#19 / CI 29302649266](https://github.com/barretlee/agent-pulse/actions/runs/29302649266)
- main CI：[29302699915](https://github.com/barretlee/agent-pulse/actions/runs/29302699915)
- 增量回流：[Data Refresh 29302751824](https://github.com/barretlee/agent-pulse/actions/runs/29302751824)
- snapshot commit：[9508f8a](https://github.com/barretlee/agent-pulse/commit/9508f8a4be99c3117a945c73d9c48a720580ccf4)
- 回流后 Pages：[29302968728](https://github.com/barretlee/agent-pulse/actions/runs/29302968728)
- AI 周报：[Issue #13](https://github.com/barretlee/agent-pulse/issues/13)

首轮 artifact 暴露了 npm banner 混入 `.json` 的次级问题，因此机器证据解析验收保持未完成，待修复后的 Actions 运行验证后再关闭 TASKS。

## 6. 最终闭环证据

- 机器证据修复：[PR #20](https://github.com/barretlee/agent-pulse/pull/20)；分支 CI [29303090401](https://github.com/barretlee/agent-pulse/actions/runs/29303090401)
- 最终增量回流：[Data Refresh 29303163556](https://github.com/barretlee/agent-pulse/actions/runs/29303163556)
- 最终 snapshot commit：[96af244](https://github.com/barretlee/agent-pulse/commit/96af2441dad4ecf975d5b727aeea8dbaebdc8df6)
- 最终 Pages：[29303373351](https://github.com/barretlee/agent-pulse/actions/runs/29303373351)
- `quality-evidence-29303163556` 中 `ai-enrichment.json`、`evaluation.json`、`weekly-status.json` 均通过直接 `JSON.parse`。
- 公开首页与 `data/timeline.json` 均返回 HTTP 200；线上 timeline `generatedAt=2026-07-14T03:23:02.763Z`，包含 126 个 Event。
