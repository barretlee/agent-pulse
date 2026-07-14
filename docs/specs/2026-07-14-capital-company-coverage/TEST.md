# 测试方案

## 来源契约

- 资本来源 manifest 精确包含 5 个来源，slug 与 endpoint 唯一。
- 全部来源为 Tier 2、expert、RSS、disabled、shadow、candidate。
- 至少一个来源为 CN，全部 endpoint 使用 HTTPS。
- 来源通过真实 audit 后仍不自动晋级 active。

## Event 契约

- 独立资本历史文件精确包含 10 个 Event。
- 每条 Event 包含 HTTPS 官方公告、`investing` track、heat=0 和完整判断字段。
- source slug 必须存在于 Source Catalog，且角色不是 aggregator。
- 合并后资本主线至少有 21 个 Event，不新增阶段定义。

## 数据闭环

- 对 5 个来源执行单源 audit，并记录 item count、质量与新鲜度。
- 对通过检查的来源执行定向采集，Signal 保留 provenance 与原文 URL。
- snapshot 写回后可恢复新增来源、Signal 和 Event。
- 静态导出包含新增 Event，不泄漏 endpoint、数据库路径、原始 payload 或 token。

## 验证命令

```bash
npm test -- tests/catalog.test.ts tests/history.test.ts tests/integration.test.ts
npm run check
npm run build
```

## 2026-07-14 实测结果

- 5 个 Feed 全部为 healthy，分别返回 10、10、10、4、10 条合法内容；最新内容均在 90 天内。
- 批次质量分：Sequoia 58、Menlo 64、Madrona 61、Battery 66、顺为 57。Sequoia 与顺为未达到 E3 的 60 分门槛，继续保持 shadow 且不启用自动 observation。
- Sequoia 的旧 quarantined 状态在 3 次连续 healthy 后按既有规则恢复为 shadow；5 个来源最终均为 disabled + shadow + candidate。
- 5 个来源在数据库中共有 46 条 Signal；本轮新建 34 条，Menlo 原有 12 条按 canonical URL 去重保留。
- 新增 10 个资本 Event 后，`investing` 主线共有 24 个公开 Event；没有修改阶段数量或边界。
- snapshot 已写回：415 Sources、4,917 Signals、431 Events，包含新增来源、检查、运行记录、Signal、Event 和关系。
- 定向 Biome、typecheck 与 50 个测试文件 / 324 项测试通过；集成测试确认 10 个 Event 进入静态 Timeline。
- 仓库级 `npm run check` 与独立 export/build 仍受工作区无关改动阻塞：`src/db/repository.ts` 存在格式问题，`src/pipeline/static-site/pages.ts` 缺少正在编辑中的 JSON-LD helper。本规格不改写这些并行变更。
