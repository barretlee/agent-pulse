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

- [ ] 分支 CI 成功
- [ ] 合入 main
- [ ] main Data Refresh 无候选路径成功且数据回流不受影响
- [ ] artifact 与 Pages 验证成功
- [ ] 真实阶段只在未来满足硬门禁时由专属 Issue + commit + Pages 闭环发布
