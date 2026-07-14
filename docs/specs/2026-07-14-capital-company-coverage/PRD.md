# PRD：资本与公司演化覆盖补强

## 背景

当前公开数据中，`investing` 主线只有 11 个 Event；17 个 `capital-business` 来源里，投资机构自动 Feed 数量少，且 Sequoia、Menlo 等已登记来源仍停留在 manual/html。结果是模型融资、云绑定、战略投资和并购转折在阶段轨迹中明显稀疏。

## 目标

1. 接入 5 个经过实时 HTTP 与 RSS 解析验证的投资机构官方 Feed，至少包含一个中国机构。
2. 新来源保持 `disabled + shadow + candidate`，单次成功不晋级 active。
3. 补齐 10 个 2023—2025 年关键资本或公司转折 Event，全部使用公司官方公告作为 Tier 1 证据。
4. 执行 source audit、定向采集和 snapshot 写回，让新增 Signal 与 Event 回流仓库。
5. 不因为补数据新增“资本与公司演化”阶段；阶段仍按既有谨慎规则维护。

## 非目标

- 不接入需要登录、验证码、付费墙或许可不明的数据。
- 不把投资机构观点当作被投公司的独立事实确认。
- 不自动发布 Feed 中的每笔融资；Signal 仍需经过聚类、证据和 readiness 门禁。
- 不引入估值、股价或付费数据库字段。

## 成功口径

- 5 个来源全部可返回带标题、原文 URL 和真实发布时间的条目。
- 资本 Event 从 11 个增加到至少 21 个，slug 唯一且 source 存在于目录。
- 定向 source audit 有明确 healthy/degraded 结果，采集失败不影响其他来源。
- `data/snapshot/v1.json` 包含新增来源、Signal、Event 与关系，且通过隐私扫描和静态导出。
