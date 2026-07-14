# PRD：GitHub Actions 增量回流与 AI 失败隔离

## 1. 问题

2026-07-14 的一次 `workflow_dispatch` 已完成采集、来源协调、DeepSeek Event enrichment、Scout、自动发布、评测、远端快照合并和静态导出，但 AI 周报因结构化输出校验失败而终止。由于周报位于 snapshot write 之前，本轮已完成的增量没有回流仓库，质量 artifact 和 Pages dispatch 也全部被跳过。

同时，Monitor 把互斥的 `active` 与 `degraded` 生命周期相减，产生 `-9% healthy` 这类不可能指标；CI 把 lint、typecheck、test、export 合并在一个步骤中，远端失败定位成本过高。

## 2. 目标

1. Data Refresh 的增量主链只被采集、确定性处理、快照安全校验或仓库写入故障阻断。
2. AI enrichment 全部失败时保留 review Event，记录安全错误与 artifact，但继续写回其他增量。
3. AI 周报先执行一次结构化修复重试；仍失败时保留上一版 Issue，记录 warning，不阻断数据主链。
4. snapshot merge、write、privacy validation、commit、push 和 Pages dispatch 必须发生在周报生成之前。
5. Actions 无论后段成功或失败，都尽可能上传已有的 evaluation、AI enrichment 和 weekly status 证据。
6. Monitor 百分比不得为负，active、degraded、quarantined/retired 分母口径一致。
7. CI 将 lint、typecheck、test、export、build 拆为可定位步骤，但保持与 `npm run check` 等价。

## 3. 非目标

- 不放宽 Event readiness、Evidence URL、Track、周报 Event slug 或占位词校验。
- 不把 AI 失败伪装为 AI 成功；必须留下 warning 和机器可读状态。
- 不在模型失败时回退到低价值模板并覆盖已发布周报。
- 不让模型修改 source lifecycle、评分、发布状态或 snapshot。
- 不把数据库、原始 payload、prompt、response 或 secret 上传为 artifact。

## 4. 验收标准

- workflow 契约证明 `git push origin HEAD:main` 与 Pages dispatch 都早于 `weekly:issue`。
- AI enrichment 命令非零时，后续 snapshot write、commit 和 Pages 仍可运行。
- 周报模型第一次返回可修复的非法结构时最多再调用一次，并累计 Token 用量。
- 周报第二次仍非法时不更新 Issue，`weekly-status.json` 记录安全错误码，job 保持数据刷新成功。
- `Upload quality evidence` 使用 `if: always()`，且不存在时不把缺失 artifact 当作数据主链故障。
- Monitor 生命周期百分比始终位于 0–100，测试覆盖 active 小于 degraded 的历史回归场景。
- 本地 `npm run check`、`npm run build` 通过；合入 main 后 Data Refresh 增量运行成功，bot snapshot commit 可见，Pages 成功。

