# 研究记录

## 仓库事实

- 静态导出已经生成中英文页面、事件详情页、`sitemap.xml`、`robots.txt`、canonical 与 hreflang。
- 当前公开快照包含 421 个 Event；导出阶段逐 Event 查询 evidence、track 和 actor，查询次数会随 Event 总量线性放大。
- Timeline 月级懒挂载降低了浏览器 DOM 成本，但 Event 主卡使用 `button`，搜索引擎不能从卡片本身发现详情 URL。
- `pageLayout` 将 JSON 字符串交给 HTML 转义后写入 `application/ld+json`，生成内容不是合法 JSON-LD。
- `/sources/` 已经是来源地图，包含覆盖、健康、观察状态和目录；继续增加来源详情页会制造重复和薄内容。
- Data Refresh 和 Source Audit 会提交版本化快照并触发 Pages，但缺少统一的跨 Tab 消费一致性报告。

## Google 官方规范结论

1. 预渲染内容对用户和爬虫都更快、更稳定；唯一 title、description 与 HTML canonical 应在初始 HTML 中提供。
2. 可抓取链接应使用带真实 `href` 的 `<a>`；只依赖点击处理器的元素不能作为可靠发现路径。
3. 懒加载不能依赖用户点击或滚动才让关键内容可见；无限或分块内容应有稳定 URL。Agent Pulse 保留完整预渲染事件页与 sitemap，Timeline 懒挂载只影响交互 DOM。
4. Breadcrumb、Article、Organization 和 Dataset 结构化数据必须与页面可见内容一致，并在发布前验证。
5. sitemap 有助于发现 URL，但不能保证收录或排名；SEO 的核心仍是准确、独特、对用户有价值的内容。

## 设计取舍

- 不新增 411 个来源详情页。来源目录中大量对象仍处于 shadow / candidate，独立页面会暗示不存在的验证深度。
- 用一个高质量 `/sources/` 来源地图承载 Dataset 语义，并把真实 Event 详情页作为主要长尾入口。
- 不把每日生成时间机械写为每个 URL 的 sitemap `lastmod`，避免向搜索引擎提供并不代表实质内容变化的时间信号。
- GEO 不单独制造“给模型看的文本”。页面继续用事实、影响、对象、下一观察与原始证据构成可引用结构。
