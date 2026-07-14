# TASKS：GitHub Actions 增量回流与 AI 失败隔离

只有代码、测试和真实运行证据齐备后才能勾选。

## 1. 规格

- [x] 记录失败运行、数据损失窗口和 Monitor 指标缺陷
- [x] 定义主链、AI 增强层、artifact 与回滚契约

## 2. 实现

- [x] AI weekly validation repair once 与 usage 汇总
- [x] Data Refresh enrichment/weekly 失败隔离
- [x] snapshot/commit/Pages 提前到 weekly 之前
- [x] always-upload quality evidence 与 Step Summary
- [x] Monitor 生命周期百分比修复
- [x] CI 分步诊断

## 3. 本地验证

- [x] 周报、Monitor 和 workflow 契约测试
- [x] `npm run check`
- [x] `npm run build`
- [x] diff/privacy/secret 检查

## 4. GitHub 闭环

- [x] 分支 CI 成功
- [x] 合入 main
- [x] main Data Refresh 增量运行成功
- [x] snapshot commit 或明确 no-change 证据
- [ ] quality artifact 可直接解析、Pages 与公开站验证成功
