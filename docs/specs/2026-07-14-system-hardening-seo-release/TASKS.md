# 实施任务

- [x] 审计当前 diff、主线差异、Actions 运行、静态导出、页面体积与 SEO 基线。
- [x] 对照 Google Search 官方文档确定 crawl、canonical、structured data 与 sitemap 边界。
- [x] 批量读取 Event evidence、track 和 actor，移除静态导出 N+1 路径。
- [x] 实现公开站完整性验证器与机器可读报告。
- [x] 将验证器接入 CI、Data Refresh、Source Audit 与 Pages。
- [x] 修复 JSON-LD 安全序列化并补齐 Event / Breadcrumb / Organization / Dataset 语义。
- [x] 让 Timeline Event 详情链接可抓取，并补齐主要页面独立 description。
- [x] 清理已确认无消费者的变量与重复逻辑，保持小 diff。
- [x] 更新根 Changelog、网站 Changelog、README 与版本号。
- [x] 执行 check、build、audit、秘密扫描、浏览器 smoke 与体积验收。
- [x] 同步 main、提交全部 diff、发布版本并验收 CI / Pages / Release / Source Audit。
