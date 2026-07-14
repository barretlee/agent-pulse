# PRD：DeepSeek AI 事件收敛与自动发布闭环

## 1. 问题

现有 GitHub Actions 可以采集、聚类、写快照和部署 Pages，但自动创建的 Event 含有“待编辑”洞察，readiness 又正确地阻止占位内容发布。结果是 Signal 持续增长而公开 Event 停滞。

## 2. 目标

1. 用 `deepseek-v4-flash` 为具有一手证据的 review Event 生成结构化中文收敛草稿。
2. 只处理规则预筛后的少量候选，不把全部 Signal 或原始 payload 发送给模型。
3. AI 输出必须通过本地 Schema、证据 URL 子集、长度、占位词和已有 Track 校验。
4. AI 不直接改状态；现有 readiness 和 auto-publish 决定是否公开。
5. 本地 `.env` 与 GitHub Actions Secret 注入密钥，仓库、日志、快照和 artifact 永不包含密钥。
6. 单 Event 失败不破坏批次；认证或系统性模型故障必须使受要求的真实验证失败并可见。
7. 周报由公开 Event、Scout 和产品评测 DTO 生成结构化决策摘要，替换固定的“关键变化 + 三件事”套话。
8. AI 周报只能引用输入 Event slug；Issue Markdown 仍由本地代码渲染和转义。

## 3. 非目标

- 不让模型抓网页、绕过访问控制或发现事实。
- 不让模型修改来源 tier/lifecycle、评分规则、schema 或发布门禁。
- 不把模型自报的置信度作为事实置信度。
- 不自动处理缺少一手证据、冲突或 unsupported heat 的 Event。
- 不承诺每天一定产生公开 Event。
- 本轮不宣称已经完成向量数据库或全量跨语言 embedding 聚类。
- 不让模型直接输出未经结构校验的 Issue Markdown。

## 4. 用户价值

- 读者获得更及时、仍可回链核验的事件判断。
- 系统主人能区分“没有合格事件”和“AI/流水线故障”。
- 运行成本与泄露面受每日候选上限、输入裁剪和重复内容跳过控制。

## 5. 验收

- 无密钥时常规开发、测试、export 正常，显式启用 AI 时给出不含秘密的错误。
- 本地真实 API dry-run 返回合法 JSON，并报告 Token 用量但不记录 prompt/response 正文。
- 本地临时数据库完成 restore -> enrich -> readiness -> auto-publish -> export。
- Actions 通过 Secret 执行 AI enrichment，随后写入快照并触发 Pages。
- 线上公开 Event 仍满足一手证据和 readiness；失败对象保留 review。
- `.env` 被忽略，`.env.example` 只含占位值。
- Issue #13 使用新模板完成一次真实 AI 更新，链接只指向输入中的公开 Event。
