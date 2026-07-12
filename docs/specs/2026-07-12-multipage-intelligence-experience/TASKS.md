# 实施任务

## 1. 规格与风险

- [x] 审计当前单页、数据加载、title、工具切片和移动导航
- [x] 审计远端 Stars、Issues、Actions 与来源写入竞争
- [x] 识别 snapshot 第三方长摘要版权风险
- [x] 确定静态多页而非 SPA

## 2. 公开站

- [x] 首页首屏改为 Today，品牌宣言移动到底部
- [x] 建立共享导航、主题、图标和设计 token
- [x] 六条主线总览与独立详情页
- [x] 时间轴独立页与事件详情页
- [x] Scout、Actors、Resources、Product 独立页与工具 Tab
- [x] Changelog 独立页与首页摘要
- [x] Sources 与 Legal 独立页
- [x] 构建期 GitHub Stars DTO 与 CTA

## 3. 版权与国际化

- [x] snapshot Signal/Discovery 摘录收敛到 320 字符
- [x] 默认英文 README、中文 README 入口
- [x] 修复过期 Hero 数字
- [x] LEGAL、纠错/下架入口、第三方 SVG notice
- [x] CONTRIBUTING_SOURCES、Code of Conduct、Citation

## 4. Issues 来源治理

- [x] Source proposal / health / correction / feature Issue Forms
- [x] Source proposal schema、解析、验证、去重与安全测试
- [x] 维护者审批后生成 disabled draft PR
- [x] 版本化 proposal catalog 可被 seed/snapshot/audit 识别
- [x] 健康 Issue 幂等维护

## 5. Actions 连续性

- [x] audit 恢复并写回 snapshot
- [x] audit/refresh 共用 writer lock
- [x] observation reconcile 与 Pages dispatch
- [x] GitHub workflow 测试与真实运行

## 6. 验收与发布

- [x] 全量自动化测试、构建和隐私扫描
- [x] 桌面与 390px 全路由浏览器 smoke
- [x] 内链、title、资源 404、控制台检查
- [x] 英文 README 与 GitHub 门面检查
- [x] PR、Release、CI、Pages 与线上 Stars 验证

## 发布证据

- PR：[#3 · feat: launch the intelligence atlas](https://github.com/barretlee/agent-pulse/pull/3)
- Release：[v0.6.0 · The Intelligence Atlas](https://github.com/barretlee/agent-pulse/releases/tag/v0.6.0)
- Source Audit：[run 29185456876](https://github.com/barretlee/agent-pulse/actions/runs/29185456876)，258 个来源完成检查
- Health Issue：[#4 · Automated source health summary](https://github.com/barretlee/agent-pulse/issues/4)
- Pages：12 个代表线上路由返回 200，构建期数据为 2 Stars、0 Forks、1 Open Issue
