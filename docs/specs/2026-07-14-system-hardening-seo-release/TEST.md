# 测试与验收

## 单元与集成

- 批量 Event 关系读取保持公开 DTO 与关联顺序不变。
- JSON-LD 中包含引号、HTML 字符和 `</script>` 时仍是合法 JSON，且不能提前结束脚本。
- Event Article 包含 canonical URL、发布时间、更新时间、关键词和安全的证据引用。
- BreadcrumbList 与页面可见路径一致。
- `/sources/` Dataset 指向同域公开 JSON，不夸大 lifecycle 状态。
- Timeline Event 主卡使用真实 `href`，脚本仍支持抽屉、修改键导航和无 JavaScript 导航。

## 公开站完整性

- 正常导出报告 `ok: true`。
- 删除任意主 Tab、事件页、sitemap URL 或篡改 generatedAt 时报告失败。
- Timeline、Signals、Scout、Actors、Sources 的 HTML 条目数与对应公开 DTO 保持约束一致。
- 所有索引页具备唯一 title、description、canonical、zh-CN / en / x-default hreflang。
- sitemap 中的每个 URL 都对应实际文件，所有实际可索引页面都在 sitemap 中。

## 性能与安全

- 导出查询数量不随 Event 数量按三倍 N 增长。
- 导出后的 CSS、核心脚本、Timeline 脚本和 Timeline JSON 继续满足现有体积预算。
- `npm audit` 无已知生产依赖漏洞；秘密扫描不命中 `.env` 或 DeepSeek key。
- `git diff --check`、lint、typecheck、tests、export、public validation、build 全通过。
- 工作流契约保证 Source Audit 与 Data Refresh 都在远端快照 merge 后、最终 export 前再次执行来源对账。

## CI/CD 与线上

1. 本地从版本化快照 restore，执行完整检查与构建。
2. 浏览器检查桌面与 390px 移动端：首页、趋势、Timeline、来源动态、行动参考、来源地图和事件详情。
3. 手动触发 Data Refresh，验证快照提交、完整性报告与 Pages dispatch。
4. 手动触发 Source Audit，验证健康 Issue、报告提交、完整性门禁和 Pages 闭环。
   对连续健康达到恢复门槛的隔离来源，确认最终快照写入 `shadow`，不会被远端旧生命周期覆盖。
5. 推送版本后等待 CI、Pages、Release 全部成功。
6. 线上验证 HTTP 200、版本 Changelog、sitemap、robots、主 Tab 数据日期与事件详情 JSON-LD。
