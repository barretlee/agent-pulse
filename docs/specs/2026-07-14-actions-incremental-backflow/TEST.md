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
- quality evidence 使用 `if: always()`；
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
6. quality artifact 包含已有 JSON 证据；
7. Pages workflow 成功；
8. `data/snapshot/v1.json` 的 `generatedAt`/运行数据与公开 DTO 形成一致闭环；
9. 公开站 HTTP 200，目标 JSON 可读取。

