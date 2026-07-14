# 测试方案

## 1. 选择与排序契约

- 置信度高的事件优先于语言和次级影响分；同置信度再比较 impact、value 与 heat。
- arXiv Evidence 可以识别非标准 category 的论文。
- confidence / impact / value、分析深度或研究影响不足的论文不进入 Timeline 论文组。
- 没有研究影响报告、报告不合格、论文标题身份不匹配或报告过期时 fail-closed。
- 月份允许 0 篇；当月超过 6 篇合格研究时只保留权重最高的 6 篇。
- 旧论文可凭年龄感知的引用影响入选；当年论文可凭“官方研究页 + 论文正文 + 出版 / 代码 / 数据 / 部署 / 独立复现之一”的有效审计包入选，不能套用成熟论文绝对引用阈值。
- 直接证据审核必须包含审核时间、有效期、失效条件和至少两条不重复 URL；过期或证据不完整时 fail-closed。

## 2. 静态页面

- “同日论文组”与 `data-research-day` 不再出现。
- 页面输出 `data-research-month`，并且论文组只有一个月份入口。
- 单月超过 6 个表层条目时输出月级展开按钮和 `data-month-extra`。
- 当月论文组不占 6 个普通 Event 名额，也不被月级收起隐藏。
- 当前真实快照中的低分自动论文不进入 Timeline，永久 Event 页面仍生成。
- 真实静态导出不再包含连续月份和最低数量断言，只断言展示的每篇论文都有合格影响报告。

## 3. 500+ 性能契约

- 500 个 Event 不启用 lazy month；501 个启用。
- lazy 页面只立即挂载最近 6 个月，更早月份输出 template。
- 搜索 / 筛选会在计算结果前挂载所有 template。
- 无 IntersectionObserver 时安全降级为全部挂载。

## 4. 浏览器验收

- 桌面与移动端月份展开 / 收起可用，按钮 `aria-expanded` 正确。
- “全部变化”展示折叠论文组；“论文与研究”只展示并展开当月论文组。
- “官方发布”和具体主线不展示论文组。
- 搜索可以命中默认折叠和 lazy 月份中的 Event，空月 / 空年隐藏。
- 抽屉、URL、Esc、焦点恢复和完整事件链接不回退。

## 5. 回归

- `npm run check`
- `npm run build`
- 静态隐私扫描和 Timeline HTML 体积检查
- `data-refresh.yml` 在 `auto:publish` 和最终 export 前运行研究影响审计，并上传审计报告；审计失败时不继续自动发布。
- Microsoft Research 与 Google Research RSS 在 Actions 中显式以 shadow 模式观察；单源失败留下 warning，不中断其他来源。
- 真实导出中 2026 年 1 月至当前月均有至少一项通过直接高质量证据门禁的研究，但该验收只约束本次已核验内容，不转化为未来逐月补量 KPI。
- 最近 6 个完整月份中连续 2 个月为空时，`research:impact` 必须失败；单个空月仍是允许结果。
