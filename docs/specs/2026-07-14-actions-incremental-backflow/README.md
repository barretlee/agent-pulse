# GitHub Actions 增量回流与 AI 失败隔离

- 状态：增量回流与 Pages 已真实验证，待机器证据 JSON 闭环
- 日期：2026-07-14
- 目标版本：Unreleased
- 前置规格：`2026-07-14-deepseek-ai-convergence`

本规格修复 Data Refresh 中“可选 AI 产物失败阻断已完成增量数据回流”的执行顺序，并收紧 Monitor 指标、CI 可诊断性和 Actions 证据留存。目标不是降低 AI 输出门禁，而是让确定性数据主链与 AI 增强层拥有清晰、可验证的失败边界。

## 文档

- [PRD](PRD.md)：问题、目标、边界与验收
- [SYSTEM](SYSTEM.md)：执行顺序、失败语义和回滚
- [TEST](TEST.md)：单元、契约、真实 Actions 与线上验证
- [TASKS](TASKS.md)：实现与验收清单

## 核心不变量

```text
增量数据主链成功
  -> merge origin/main
  -> write privacy-safe snapshot
  -> validate
  -> commit + push main
  -> dispatch Pages

AI enrichment / AI weekly failure
  -> visible warning + bounded artifact
  -> keep Event in review / keep previous weekly Issue
  -> never discard the successful deterministic increment
```
