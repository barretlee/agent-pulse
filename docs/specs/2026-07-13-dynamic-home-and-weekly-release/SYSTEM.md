# 系统设计

## 变更前基线

- 实施前静态导出只把 published Event、Source 目录等对象写入前台 DTO。
- 实施验收快照有 411 个来源、4,386 条 Signal、224 个 Event，其中 109 个 Event 已公开；其余对象继续受硬门禁约束。
- 实施前首页趋势判断固定跟随最新 lead Event，近期变化固定取最新 4 条，行业趋势为六卡网格。
- 实施前 data refresh、source audit、quality guard 和 monitor 使用日内高频 schedule。

## 目标结构

```text
SourceAdapter
  -> Signal + Observation (受控证据层)
  -> public signal allowlist
       -> dist/data/signals.json
       -> /signals/ 来源观察页
       -> 首页来源观察入口

Published Event
  -> latest eligible tracks/events
       -> 多个趋势判断候选
       -> 近期变化候选
       -> 浏览器端随机选择

GitHub Actions
  source-audit (周日早间)
    -> data-refresh (每天晚间)
       -> snapshot commit
       -> Pages dispatch
       -> weekly renderer (仅周日或显式触发)
            -> 有公开 Event: weekly-brief Issue
            -> 零公开 Event: skip
    -> monitor / quality-guard (周一验收)
```

## 公开观察 DTO

新增 `PublicSignal`：

- `title`
- `description`：从规范化 summary 去除标签、折叠空白并截断到 220 字符
- `url`
- `sourceSlug`
- `sourceName`
- `sourceTier`
- `sourceRole`
- `sourceRegion`
- `publishedAt`
- `collectedAt`
- `category`
- `tags`
- `language`

不输出完整 summary、raw meta、metrics、内部 ID、triage 或管理状态。URL 仅允许 HTTP(S)。页面始终使用文本节点或 HTML escape，禁止执行来源 HTML。

## 首页随机与轮播

- 服务端预渲染全部候选，第一项默认可见，保证无 JS 可读。
- JS 使用 Fisher-Yates 洗牌选择趋势和近期变化，不持久化单一选择。
- 六个趋势块不互相轮播；每块内部的 Event slide 独立轮播且不复制内容，手动交互后重置该块的自动播放。
- `prefers-reduced-motion` 下关闭自动播放与平滑位移。
- 所有控件提供 `aria-label`、`aria-live`、`aria-current` 和键盘行为。

## 周更节奏

- source audit：每周日 06:37（Asia/Shanghai）。
- data refresh：每天 20:17（Asia/Shanghai）抓取并刷新 Pages；周日同一轮默认生成当周周报。
- monitor：每周一 08:17（Asia/Shanghai），审计新鲜度上限调整为 9 天。
- quality guard：每周一 08:47（Asia/Shanghai），只在质量低于门槛且没有近期成功刷新时触发一次补偿刷新。
- 所有 workflow 保留 `workflow_dispatch` 以便人工恢复。

## 周报表达

- 正文固定为“一句话判断 -> 本周关键变化 -> 下周三件事 -> 仍需验证”，避免把运行报表直接铺给读者。
- Event 按 slug 去重后最多展示 3 条，并在事件内合并受影响主线；没有新证据的主线只用一行汇总。
- renderer 在当前 ISO 周没有公开 Event 时返回空正文；workflow 只在输出文件非空时设置 `publish_weekly=true`。
- Scout 先按触发 Event、再按行动类型去重，最多展示 3 条，只保留最小动作和一条统一停止条件。
- 版本、评测、覆盖与快照时间放入 `<details>`，marker 与公开 DTO 安全边界保持不变。

## GitHub Star 新鲜度

- 静态构建值保证首屏与离线可用；页面加载后立即请求 GitHub 官方仓库 API，并以 `cache: no-store` 覆盖静态值。
- 六小时本地缓存只在静态值缺失时提供失败兜底，不得阻止实时请求；成功响应标记为 `data-github-stars-source=live`，便于浏览器验收。

## 回滚

- 首页 JS 失败时回退到第一项静态内容。
- `signals.json` 加载失败时观察页显示静态首批记录与错误提示，不影响 Event 页面。
- 周报是 Data Refresh 的隔离增强层：失败时不创建重复 Issue并保留上一版，但已经通过隐私校验的 snapshot 仍先行写回仓库；可用同一周 marker 手动重跑。
- Release 或 Pages 失败时保留已验证 commit/tag，但不得宣称发布完成，修复后重跑对应 workflow。
