# PRD：系统收口、发布稳定性与 SEO/GEO

## 背景

Agent Pulse 的目标是让高价值 AI 变化从原始证据进入可验证的 Event、趋势判断和行动参考。当前数据采集、聚类、快照回流和 Pages 发布已能自动运行，但“工作流成功”仍不足以证明首页、趋势、事件脉络、来源动态和行动参考都读取了同一次完整导出。与此同时，事件页虽已预渲染，Timeline 主卡仍以按钮为主；JSON-LD 使用 HTML 实体转义，既不利于搜索引擎解析，也存在脚本上下文边界风险。

## 目标

1. 让公开导出使用批量关系查询，避免 Event 数量增长后出现线性 N+1 查询放大。
2. 增加确定性的公开站完整性检查，验证主 Tabs、公开 JSON、事件详情、canonical、hreflang、sitemap 与同一次生成时间的一致性。
3. Data Refresh、Source Audit、Pages 和 CI 在发布或提交数据前都执行同一检查；失败时不得提交不完整快照或部署站点。
4. 让 Timeline Event 使用真实 `href`，普通点击仍打开证据抽屉，修改键或无 JavaScript 环境可直接进入事件详情页。
5. 修复 JSON-LD 序列化；为事件页补齐 Article、BreadcrumbList、证据引用与更新时间，为来源地图补充可信的 Dataset 描述。
6. 为主要页面提供独立、准确的 title 与 description，并保持中英文 canonical / hreflang 对称。
7. 只删除已由编译器、检索和测试确认无消费者的代码，不做大规模“猜测式”重构。

## 非目标

- 不生成数百个内容单薄的来源详情页，也不把目录收录伪装成已验证观测。
- 不用 AI 决定页面是否可发布；一致性、安全和隐私继续由确定性代码检查。
- 不承诺 Google 排名或收录结果。实现目标是提高可抓取性、语义清晰度和技术合规度。
- 不引入客户端框架、运行时搜索服务、Service Worker 或新的数据库。
- 不改变 Event 是唯一事实节点的领域模型。

## 成功口径

- 单次静态导出不再为每个 Event 分别查询 evidence、track 和 actor。
- `npm run public:validate` 对所有主页面和公开数据执行检查，并输出可归档 JSON 报告。
- 所有会更新数据或部署 Pages 的工作流在写入或部署前执行完整性门禁。
- Timeline 中每个公开 Event 都存在可抓取的详情链接；事件页 JSON-LD 可以直接 `JSON.parse`。
- sitemap 覆盖所有中英文可索引页面，事件详情 canonical、hreflang 和 sitemap URL 一一对应。
- `/sources/` 继续作为唯一来源地图，页面明确区分 catalog、health、observing 和 production，并发布 Dataset 结构化描述。
- `npm audit`、秘密扫描、`npm run check`、`npm run build`、浏览器 smoke、Data Refresh、Source Audit、Pages、CI 与线上 HTTP 验收全部通过后才发布版本。
