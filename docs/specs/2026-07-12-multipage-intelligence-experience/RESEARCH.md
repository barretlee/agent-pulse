# 调研与决策记录

## 当前代码

- 单页一次加载 7 份 JSON，约 229KB；四个工具未打开也加载。
- Scout 只显示 3/4、Actor 只显示 10/33、Product 隐藏大部分能力与评测。
- `product.json` 已有完整 release 数据，但前端无 Changelog 页面。
- 44 个公开事件中 36 个有一手证据，8 个无 Track，0 个无证据。
- 当前导航在小屏隐藏，没有等价移动导航。
- 多数字号为 8–11px，信息密度以牺牲可读性实现。

## GitHub 现状

- 公开仓库，调研时 2 Stars、0 Issues。
- 最近 CI、Refresh、Pages 成功；source-audit 尚未证明跨运行累计。
- Issues 只有 bug form；main 无 branch protection。
- data-refresh 与 source-audit 使用不同 concurrency group，均可能写 main。

## 版权审计

- snapshot 有 1,673 条 Signal；454 条 summary 超过 1,000 字符，311 条超过 1,800 字符。
- 公开文档声称只存 metadata，与实际长摘要不一致。
- 决策：公开 snapshot 使用 320 字符上限；MIT 只覆盖代码/自有文档；新增 legal/correction/takedown。

## 图标选择

调研比较 Lucide、Tabler Icons 和 Heroicons。三者均提供宽松许可的 SVG；本轮选择 Lucide 子集，原因是 24×24 stroke 体系适合现有编辑型界面，能够本地内联且不引入运行时 CDN。需要固定版本并保留第三方 notice。

## React 决策

不采用 React SPA。当前数据与交互规模不需要框架；GitHub Pages 的 SPA 404 fallback 会损害独立 title、canonical、分享和首屏。未来若引入 React，只接受 SSG/多入口预渲染。

