# 系统设计

## 1. 无人值守发布

```text
collect -> cluster -> source reconcile -> observation / activation
        -> scout generate -> deterministic publication gate
        -> event readiness -> publish ready events
        -> evaluate -> snapshot -> Pages
```

Scout publication gate：

```text
linked published Event
  AND total >= 72
  AND evidence >= 70
  AND confidence >= 70
  AND novelty >= 55
    -> published
else -> archived
```

Event 继续复用唯一的 `evaluateEventReadiness()`；自动化只改变 ready Event 的状态，不降低门槛。

## 2. 质量守卫与调度

```text
quality-guard (every 2h)
  -> restore snapshot
  -> evaluate
  -> score < 60 ?
       no  -> record evidence
       yes -> latest data-refresh older than 2h or failed ?
                yes -> workflow_dispatch data-refresh incremental
                no  -> cooldown, no duplicate dispatch

data-refresh (every 4h)
  -> full bounded update
  -> commit privacy-safe snapshot when changed
  -> dispatch Pages
```

Quality Guard 不修改评分权重，也不把触发刷新描述为分数已提升。

## 3. GitHub Release

```text
CI success on main
  -> read package.json version
  -> verify CHANGELOG [version]
  -> verify website releases contains version
  -> tag/release already exists ? no-op : gh release create
```

Release notes 只抽取对应版本章节；`Unreleased` 永远不会创建 GitHub Release。

## 4. 时间密度

密度标准使用 UTC 自然月：最近三个完整月每月最少 6 个公开 Event。补齐只使用已经进入仓库的一手来源事实，并为每条补齐事实、技术变化、产业影响、未来验证和行动含义。测试直接统计 curated + public Event，防止回归。

页面同时展示最近三个月事件数量；当前月不因尚未结束而被判为失败。

## 5. 论文批次连续性

```text
latest 3 UTC days
  -> count published arXiv-backed research Events
  -> count > 0: show batch count
  -> count = 0 and weekend: official weekend cadence
  -> count = 0 and weekday: awaiting next verified batch
```

这只是采集状态说明，不生成虚假 Event。已有同日 4 篇以上内容仍使用论文日报聚合。

## 6. KOL 身份矩阵

`influencers.ts` 维护公开 allowlist：姓名、地区、关注领域、可自动 feed、平台 profiles 与 access 状态。Feed 进入 SourceAdapter；profiles 只用于身份和发现，不作为重大事实的唯一证据。

```text
personal RSS / Atom -> normal Source lifecycle -> Signal
X / LinkedIn / Weibo / Jike profile
  -> identity + discovery metadata
  -> restricted when platform access is unavailable
  -> never bypass login or anti-bot
```

## 7. 视觉表达

构建时间与事件最近进展相差不超过 7 天时添加 `is-recent` 和 `data-recent="true"`。高亮只表达时间新鲜度，不等于高可信或高热度。

