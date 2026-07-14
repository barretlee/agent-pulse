# 重大事件驱动的趋势阶段晋级

- 状态：实现与本地验证完成，待 Actions 验收
- 日期：2026-07-14
- 目标版本：Unreleased
- 前置规格：`2026-07-13-timeline-design-and-daily-brief`

本规格为六条趋势增加一个极低频、证据优先、可审计的阶段晋级链路。普通热点、新增 Event 或运行次数都不能产生新阶段；只有确定性门禁先证明存在阶段级转折候选，DeepSeek V4 Pro 再基于公开 Evidence 做结构化判断，并再次通过本地门禁后，系统才允许新增阶段、合并关联证据和信源，并创建专属 GitHub Issue。

## 文档

- [PRD](PRD.md)：用户价值、边界和验收标准
- [RESEARCH](RESEARCH.md)：当前代码事实、模型能力与方案选择
- [SYSTEM](SYSTEM.md)：门禁、持久化、Issue、工作流和回滚
- [TEST](TEST.md)：单元、契约、失败隔离与线上验收
- [TASKS](TASKS.md)：实现顺序与完成状态

## 核心不变量

```text
普通 Event / 普通热度
  -> 保持当前阶段，只把 Evidence 归入现有开放阶段

阶段级转折候选
  -> deterministic eligibility gate
  -> DeepSeek V4 Pro, thinking=enabled, reasoning_effort=high
  -> schema + provenance + novelty + boundary gate
  -> create/update dedicated GitHub Issue
  -> persist one new stage at most
  -> export + snapshot commit + Pages

任何一步不满足
  -> hold / warning + bounded artifact
  -> 不新增阶段
  -> 不阻断确定性增量数据回流
```
