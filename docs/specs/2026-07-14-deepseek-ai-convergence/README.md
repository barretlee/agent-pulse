# DeepSeek AI 事件收敛与自动发布闭环

- 状态：实施中
- 日期：2026-07-14
- 目标版本：Unreleased
- 前置规格：`2026-07-12-data-recovery-and-continuous-evolution`

本规格补齐 `Signal -> Event -> readiness -> Pages` 中缺失的事件收敛步骤，并把低价值的固定周报模板升级为 AI 辅助的决策周报。DeepSeek 只读取经过规范化、裁剪且已经绑定到 review Event 的公开证据候选或公开静态 DTO，输出结构化草稿；确定性代码继续负责来源生命周期、证据门禁、Schema 校验、Markdown 渲染、发布与回滚。

## 文档

- [PRD](PRD.md)：问题、目标、边界与验收
- [SYSTEM](SYSTEM.md)：运行流、模型边界、安全和回滚
- [TEST](TEST.md)：单元、真实 API、Actions 与 Pages 验证
- [TASKS](TASKS.md)：实施与验收清单

## 核心原则

```text
AI may propose; deterministic gates decide.
```

没有合格事件时允许当日发布数为 0，但流水线必须留下可观察的候选数、调用数、Token、阻塞原因和部署状态。
