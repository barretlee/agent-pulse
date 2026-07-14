# 系统设计

## 数据流

```text
投资机构官网
  -> 实时 endpoint / RSS 解析探测
  -> Source Catalog (disabled + shadow)
  -> 单源 source audit
  -> 定向隔离采集
       -> Signal + provenance
       -> quality / dedupe / cluster gates
       -> 不自动生成公开 Event

公司官方资本公告
  -> 人工事实核验
  -> CuratedEventSeed
  -> investing + 相关支线
  -> seed / snapshot / static export
```

## 来源选择

接入 Sequoia、Menlo、Madrona、Battery Ventures 与顺为资本官方 Feed。Sequoia、Menlo 沿用既有 slug，仅把采集方式升级为 RSS；其余来源放入独立资本来源 manifest。

Lightspeed 的公开 Feed 虽可访问，但当前同时输出 founder、company profile 与文章，噪声边界不满足本轮要求，因此保持原有 manual/html 状态。启明、真格、创新工场页面没有可验证的稳定 Feed，继续作为后续 manual/专用 adapter 候选，不伪装为自动采集。

## 事实边界

- 融资金额、估值、投资方、并购与合作条款只写入官方公告明确披露的内容。
- `fact` 只陈述公告事实；资本结构和竞争含义放在 `summary`、`industry` 与 `business`。
- 投资机构 Feed 作为候选发现和其自身投资立场的一手来源，不自动替代被投公司确认。
- 历史 Event 的热度保持 0，不把当前传播热度倒灌到历史节点。

## 回滚

- 资本来源 manifest 可整体从 `sourceCatalog` 移除，历史 provenance 由 seed 软退役保留。
- Event 文件是独立数组，可从 `historicalEvents` 移除而不改变 schema。
- 所有来源默认 disabled/shadow，不改变生产采集范围。
