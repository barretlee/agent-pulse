# TASKS：DeepSeek AI 事件收敛与自动发布闭环

只有代码、测试和真实运行证据齐备后才能勾选。

## 1. 规格与配置

- [x] 核对官方模型标识、JSON Output 与 thinking 控制
- [x] 定义输入 allowlist、输出 Schema、候选门禁和回滚
- [x] 增加安全环境配置、`.env.example` 和文档

## 2. 实现

- [x] DeepSeek client：timeout、retry、usage、安全错误
- [x] AI enrichment：候选选择、输入裁剪、Schema 校验、事务更新
- [x] AI 周报：公开 DTO 输入、结构化输出、确定性 Markdown
- [x] CLI、package script 与 Data Refresh step
- [x] 运行摘要和 Actions artifact

## 3. 验证

- [x] mock 单元/集成/工作流契约测试
- [x] 本地真实 API dry-run
- [x] 本地真实 AI 周报生成与 Issue #13 预览
- [x] 本地临时库全链路
- [x] `npm run check`、`npm run build` 和 secret 扫描

## 4. GitHub 闭环

- [x] Actions Secret 配置
- [x] 分支 CI 通过
- [x] main Data Refresh 真实成功
- [x] Issue #13 使用新 AI 周报模板更新并验收
- [x] bot 快照提交、Pages 部署与线上内容验证
- [x] 更新状态、Changelog 和网站 Changelog
