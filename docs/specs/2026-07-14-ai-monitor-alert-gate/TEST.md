# 验证计划

## 单元测试

- 站点不可达：无论 AI 是否建议 suppress，都必须 alert。
- 监控脚本崩溃：必须 alert。
- 快照超过 72 小时：必须 alert。
- active 占比低但审计健康率高：允许 AI suppress。
- 同一指纹在七天内：不调用 AI，直接 suppress。
- AI alert 置信度不足：降级 suppress。
- AI 不可用或 JSON 无效：上下文型 critical suppress，并记录 fallback。
- 人工 dry-run：保留 `wouldNotify`，但 `notify=false`。

## Workflow 契约

- schedule 保持每周一 08:17（Asia/Shanghai）。
- `workflow_dispatch` 提供默认关闭的 `allow_notification`。
- 决策 JSON 在 Issue 写入前通过 `jq` 校验并作为 artifact 上传。
- Issue 写入条件只依赖经过本地验证的 `notify=true`。
- Job Summary 记录 decision source、reason code、fingerprint 和 rationale，不记录模型原始响应。

## 完成检查

- `npm run check`
- `git diff --check`
