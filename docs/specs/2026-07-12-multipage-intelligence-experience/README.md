# 多页情报体验与社区化来源治理

状态：实施中  
目标版本：v0.6.0  
范围：公开静态站、静态导出、GitHub 门面、Issues 来源治理、Actions 数据连续性、版权与纠错机制。

本轮把 Agent Pulse 从“一张很长的展示页”改造成可被持续消费、分享和索引的静态多页情报产品。首页只负责今日判断与全站导流；六条主线、证据时间轴、星探、角色、资源、系统水位、Changelog、来源与版权各自拥有稳定 URL、独立 title 和足够的信息密度。

同时修复两项底层问题：来源审计工作流没有恢复/写回仓库快照，导致 20 次检查与 7 天观察无法跨 Actions 累积；公开 snapshot 保存了过长的第三方摘要，与“只保存必要 metadata 和有限摘录”的版权原则不一致。

```text
Public Issue                     Scheduled source operations
     │                                      │
     ▼                                      ▼
untrusted proposal              shared snapshot restore
     │                                      │
static validation               audit / collect / observe
     │                                      │
maintainer approval             privacy-safe snapshot write
     │                                      │
disabled draft PR ─────────────► versioned source catalog
                                             │
                       shadow → E3 observe → human E4 promotion
```

规格文件：

- [PRD.md](PRD.md)：产品目标、页面职责、用户流程和验收标准。
- [SYSTEM.md](SYSTEM.md)：静态多页、数据 DTO、Issues intake、Actions 与版权边界。
- [TEST.md](TEST.md)：自动化、浏览器、版权与发布测试矩阵。
- [TASKS.md](TASKS.md)：实施清单与完成证据。
- [RESEARCH.md](RESEARCH.md)：当前代码、远端 GitHub 与外部图标许可调研。

