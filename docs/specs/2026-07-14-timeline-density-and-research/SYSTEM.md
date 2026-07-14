# 系统设计

## 1. Timeline 选择层

```text
published Event
  -> research detection
       research -> content gate -> impact evidence gate -> monthly research pool
       other    -> presentation score
  -> group by latest development year/month
  -> rank normal events by confidence, impact, value and heat
  -> monthly research group + first 6 normal events + month expand remainder
```

`timelinePresentationScore()` 只影响 Timeline 表示顺序，不回写 Event 分数。排序采用 confidence、impact、value、heat 的字典序权重；不使用语言比例或语言加权。

## 2. 当月论文组

`groupTimelineMonthItems()` 输出普通 Event 与最多一个 `research-month`：

```ts
type TimelineMonthItem =
  | { kind: "event"; event: EnrichedEvent }
  | { kind: "research-month"; key: "2026-07"; events: EnrichedEvent[] };
```

论文组内按研究展示权重倒序，最多保留 10 篇。月份没有通过外部影响证据门禁的论文时不创建研究组；目录中的月度候选数不等于公开入选数。组摘要展示月份、入选数和高频关键词，默认折叠，在“论文与研究”筛选或关键词命中时自动展开。

## 3. 研究影响报告

GitHub Actions 在自动发布和静态导出前运行 `research:impact`：

```text
published/review research Event + primary research URL
  -> normalize arXiv / DOI identity
  -> fetch bounded OpenAlex metadata in batches
  -> verify title identity when an index record exists
  -> calculate mature-paper citation signals
  -> merge audited direct-source / peer-review / industry evidence
  -> data/reports/research-impact.json
  -> Timeline consumes only qualified assessments
```

报告为版本化、隐私安全的审计数据，记录 event slug、论文标识、指标、入选路径、理由、审核时间、失效条件和来源 URL。成熟论文继续要求索引身份一致；当年论文可以通过“官方研究页 + 论文正文 + 出版 / 代码 / 数据 / 部署 / 独立复现之一”的直接证据路径进入。证据冲突、报告缺失或报告过期时采用 fail-closed。OpenAlex 暂时不可用时，不撤销仍在有效审核期内的直接证据结论。指标或判断发生变化时立即更新；没有变化时按 7 天 freshness 窗口刷新检查时间，避免每日制造无意义 diff，也不会超过 14 天展示有效期。

报告同时检查最近 6 个完整月份。连续 2 个完整月份没有任何合格研究时，Actions 研究审计失败并留下明确缺口；该门禁只触发补充调查与信源修复，不自动降低阈值或生成占位论文。

OpenAI Research、Google Research、Google DeepMind、Anthropic Research 与 Microsoft Research 的官方研究页用于直接发现；正式论文、Nature / 会议页面、OpenReview 与官方代码仓库用于核验。OpenAlex 继续负责成熟论文的开放学术图谱与引用趋势；Semantic Scholar 和 Crossref 可作为交叉核验。任何单一平台都不能同时证明论文质量、同行认可与产业影响。

## 4. 月级展开

- 静态 HTML 保留全部合格 Event，确保内容可审计。
- JavaScript 初始化后，超过 6 个表层条目的月份进入 collapsed 状态。
- 第 7 个普通 Event 起标记 `data-month-extra="true"`，月标题提供 `aria-expanded` 按钮；当月论文组不占这 6 个名额。
- 搜索或非默认筛选不受 collapsed 状态截断；清空筛选后恢复用户对该月的手工展开状态。

## 5. 超过 500 Event 的分组懒挂载

当公开 Event 总量大于 500：

- 最近 6 个月正常进入 DOM；
- 更早月份的卡片列表放入原生 `template`，月份标题和数量仍立即可见；
- `IntersectionObserver` 在月份距离视口 800px 内时挂载该月 template；
- 不支持 IntersectionObserver 时立即挂载全部月份；
- 搜索或筛选前先挂载全部待检索月份，保证结果完整；
- 抽屉继续只在首次打开时读取完整 `timeline.json`。

该策略降低初始 live DOM、样式计算和布局成本，不改变公开 DTO，也不增加第三方请求。

## 6. 筛选状态

```text
all       -> normal Events + monthly research group
research  -> monthly research group only, auto-open
official  -> normal Events with primary evidence; no research group
track     -> matching normal Events; no research group
query     -> apply inside currently allowed view; matching research auto-open
```

月、年、论文组和卡片的 hidden 状态继续使用显式 CSS，避免空月份标题残留。

## 7. 回滚

- 500 阈值、初始月份数、单月 6 条和论文最多 10 篇均为代码常量，可单独回滚。
- 移除 template 分支即可恢复全量 DOM。
- 研究影响报告可以回滚到上一版本；门禁失败不影响数据库、永久事件页或 Evidence，只收紧 Timeline 注意力入口。
