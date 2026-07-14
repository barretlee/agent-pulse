# TASKS：重大事件驱动的趋势阶段晋级

只有代码、测试和真实证据齐备后才能勾选。

## 1. 规格

- [x] 核验静态阶段、双时间轴 Evidence、AI client、fingerprint 与 Data Refresh
- [x] 核验 DeepSeek V4 Pro 官方 model id、thinking 和 JSON 能力
- [x] 定义资格门禁、二次校验、Issue、持久化、失败隔离与回滚

## 2. 实现

- [x] DeepSeek 请求级 thinking/high effort 支持
- [x] 阶段候选、V4 Pro verdict 与本地 provenance/novelty gate
- [x] 受版本控制的 stage promotion 文件与导出合并
- [x] 专属 GitHub Issue render/upsert/apply
- [x] Data Refresh 顺序、commit、privacy、artifact 与 summary
- [x] narratives public fingerprint 与产品 Changelog

## 3. 本地验证

- [x] 单元、集成和 workflow 契约测试
- [x] `npm run check`
- [x] `npm run build`
- [x] workflow YAML/shell、diff、secret/privacy 检查

## 4. GitHub 闭环

- [x] 分支 CI 成功
- [x] 合入 main
- [x] main Data Refresh 审慎 `held` 路径成功且数据回流不受影响
- [x] artifact 与 Pages 验证成功
- [x] 真实阶段只在未来满足硬门禁时由专属 Issue + commit + Pages 闭环发布

## 5. 验收证据

- PR 与 CI：<https://github.com/barretlee/agent-pulse/pull/24>
- Data Refresh：<https://github.com/barretlee/agent-pulse/actions/runs/29304798186>
- 增量快照提交：`fb4457a`
- Data Refresh 触发的 Pages：<https://github.com/barretlee/agent-pulse/actions/runs/29305030269>
- Source Audit：<https://github.com/barretlee/agent-pulse/actions/runs/29305082710>
- Source Audit 触发的 Pages：<https://github.com/barretlee/agent-pulse/actions/runs/29305172423>
- 健康摘要 Issue：<https://github.com/barretlee/agent-pulse/issues/4>
