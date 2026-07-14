# Monitor 告警降噪与 AI 复核

状态：已实现并通过本地契约验证

## 背景

`monitor.yml` 已从日内高频 schedule 收敛到每周运行，但人工连续触发仍会反复改写同一个 critical Issue。现有规则还把大量处于 `shadow` 验证期的来源计入生产覆盖率，导致“active 占比低、观测健康分高”的目录结构被误报为生产故障。

## 目标

- 站点不可达、监控脚本崩溃等确定性硬故障继续立即告警。
- 重复告警使用稳定指纹和七天冷却，不因分数轻微变化反复通知。
- 来源覆盖、快照新鲜度等上下文型 critical 交给 AI 做结构化复核，并由本地规则校验结果。
- `workflow_dispatch` 默认只产出评估证据，不写 Issue；人工明确允许通知后才进入正常告警门禁。
- AI 不可用、输出无效或置信度不足时，不把上下文型问题升级为通知，但保留 artifact 和 Job Summary。

## 非目标

- AI 不修改监控原始事实、严重度或来源生命周期。
- AI 不关闭、创建或编辑 Issue；外部写操作仍由 workflow 的确定性步骤执行。
- 本次不改变 source audit、data refresh 或 quality guard 的运行节奏。

## 文档

- [SYSTEM.md](./SYSTEM.md)
- [TEST.md](./TEST.md)
- [TASKS.md](./TASKS.md)
