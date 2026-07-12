# TASKS：数据恢复与持续进化

只有代码、测试、真实运行和页面证据齐备后才能勾选。

## 0. 基线与规格

- [x] 记录 195/6/189 来源水位和 253/234/36 内容漏斗
- [x] 审计在途 adapter/monitor/evolve 实现和质量声明
- [x] 定义 probe 与 production collect 分离
- [x] 定义 5 小时迭代循环、回滚和诚实发布边界

## 1. 第一轮：来源检查控制面

- [x] 清理在途实现 lint/runtime 问题与不实 Changelog 声明
- [x] 新增 source_checks schema、repository 和公开报告边界
- [x] 实现并发但有界的全目录 probe
- [x] 形成结构化失败分类、修复和保留建议
- [x] 修正 manual/social/restricted adapter 映射
- [x] probe 不直接 active，保留 shadow 晋级门槛
- [x] 管理台展示 checks/runs/health/coverage
- [x] 运行全部 195 个来源并形成四轮对比报告

## 2. 第二轮：运行时与适配器恢复

- [x] RSS/Atom contract 与真实源修复
- [x] GitHub repository/release contract 与真实源修复
- [x] 通用官方 JSON API schema 与 WordPress rendered field 支持
- [ ] HTML metadata 与 dynamic-required 分类（日期、feed、page-meta 已完成，浏览器型来源仍待分类）
- [x] 显式代理策略、NO_PROXY、无敏感日志
- [x] domain rate budget、cache、retry 与 cancellation
- [x] 通过检查的来源保持 shadow，禁止一次检查直升 active

## 3. 第三轮：质量、去重与发布漏斗

- [x] 质量评分接入正式 collect，保存分项和样本水位
- [x] URL/title/content fingerprint 与模型 family/facet 候选去重
- [x] 增加 pipeline stage metrics、deferred 与 readiness reason
- [x] 自动聚类占位内容保持不可发布，低事件化信号进入可逆 triage
- [x] 多源/primary evidence 门禁
- [x] 管理台展示 Signal→Event→Ready→Published 损耗

## 4. 第四轮：数据池与来源增长

- [ ] 从 backlinks/Actor/GitHub/论文/监管生成候选
- [ ] 候选可访问、频率、相关、历史、质量、重复、稳定、合规评分
- [x] 升级 Qwen、MLCommons、LlamaIndex、Menlo 与代理恢复数据池
- [ ] 加强中国厂商、投资、商业化、政策、算力覆盖
- [x] 候选保持 disabled draft/shadow，晋级需要证据

## 5. 第五轮：自进化、页面与发布

- [x] iteration report、前后指标和下一轮 proposal
- [x] supervisor checkpoint、graceful shutdown、单轮隔离
- [x] 管理台与公开页桌面浏览器 smoke、真实 API 数字和 console 检查
- [x] 390px 移动端边界、详情面板和横向溢出检查
- [x] 公开页内容质量/密度评测和人工抽检
- [ ] GitHub refresh、snapshot、Pages 真实闭环
- [x] 连续运行至少 5 小时，保存 24 轮长期摘要与最终 completed 复跑
- [x] README、SYSTEM、Capabilities、Changelog 更新到第五轮正式库事实

## 6. 第六轮：100+ 有效供给、诚实评测与体验改版

- [x] E2 healthy 且有内容、质量不低于 60 的有效来源达到 120，严格实时交集达到 104
- [x] 新增 E3 shadow observation 模式，和 E4 production activation 解耦
- [x] 完成 99 个合格 shadow 来源的观察采集启用与失败回收
- [x] 评测重标定：insufficient-data 计入总分并应用样本/证据硬上限
- [x] 最终真实评测从旧口径 69 降为 30，显示 raw 42 与证据覆盖 20%，E3 不冒充 E4
- [x] Timeline、事件预览和 390px 移动体验完成改版与浏览器复验
