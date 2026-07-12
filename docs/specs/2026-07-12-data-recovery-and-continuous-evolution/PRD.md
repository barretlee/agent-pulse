# PRD：数据恢复与持续进化

## 1. 问题

系统已经拥有 195 个来源目录项和定时 GitHub Actions，但“目录覆盖”不等于“有效观测”。2026-07-12 基线显示：

- 195 个来源中只有 6 个 active、189 个 shadow；
- 仓库快照有 253 个 Signal、234 个 Event，但公开 Event 只有 36 个；
- 现有 Event 自动聚类会生成大量 review 占位内容，不能直接公开；
- SourceRun 只能描述正式采集，无法完整表达 probe、格式、最新时间、重复率、质量、代理需求、修复建议和保留决策；
- 来源发现、健康建议和进化循环已有在途实现，但尚未通过 lint、运行态和诚实发布验收；
- 通用适配器可能把“页面可访问”误判为“稳定内容源”，制造虚假成功率。

## 2. 目标

### G1 全目录可检查

对每个配置来源生成可审计检查记录，至少包含：

- access、fetch、parse、schema、content count、latest item、duplicate ratio、quality；
- HTTP/错误分类、是否可能需要代理、修复建议、保留/隔离建议；
- adapter/version、检查时间、耗时、样本窗口和证据摘要。

### G2 供给恢复

- 按失败簇修复 RSS/Atom、GitHub releases、官方 JSON API 和允许抓取的 HTML metadata；
- 单来源失败不阻塞批次；临时故障保持可重试，不直接 retired；
- 来源只有经过 shadow 运行和质量门禁后才能 active；
- 聚合站只进入 discovery/heat，不能成为公开事实终点。

### G3 内容晋级

测量并改善：

```text
discovered -> fetched -> normalized -> unique -> clustered
           -> evidence-ready -> reviewed -> published
```

每个阶段记录数量、损耗率、失败原因和可重试状态。优先提升 evidence-ready 内容，不以自动发布低质量 Event 追求前台数量。

### G4 可观测和自进化

- 管理台展示来源检查、正式运行、质量、覆盖和故障历史；
- 每轮生成版本化 iteration report，包含前后指标、能力增量、回归结果和下一轮任务；
- 下一轮任务来自量化缺口，但不得静默修改 schema、来源生命周期和发布规则。

### G5 产品价值

公开页增加经过审核的高价值事件与上下文，覆盖厂商、研究、模型、产品、商业、资本、组织、政策、算力和中国牌桌玩家。每条公开内容回答发生了什么、为什么重要、影响谁、接下来观察什么，并保留一手证据。

### G6 高质量满意水位（2026-07-12 加严）

“来源数量、页面漂亮、字段完整”都不能单独算达标。采用四层来源口径：

```text
E0 catalog     只有身份、分类和端点
E1 reachable   当前可访问，但未证明能产出内容
E2 healthy     最新检查有合法内容、显式时间、质量 >= 40
E3 observing   E2 来源进入 shadow 采集，数据只进观察池，不进公开事实
E4 production  20 次 healthy + 至少 7 天观察 + 人工确认后 active
```

- 本轮硬目标：E2 达到 100+，并让其中合格来源进入 E3 持续供给；不得把 E1 计作有效来源；
- E4 不能通过压缩时间或重复瞬时检查伪造，需在后续 7 天自然观察窗逐步晋级；
- 评测总分必须把 insufficient-data 计入，低样本、低健康率、低多源证据和无用户结果需要硬上限；
- 公开页 30 秒内应完成“今日判断 → 六条主线 → 事件证据”的理解，事件预览不超过 2 次交互；
- 桌面与 390px 移动端无全局横向溢出；一手、二手、推断和观点在视觉与文案上明确区分。

## 3. 非目标

- 不把目录源全部直接设为 active；“全部开启检查”“进入 shadow 观察”和“进入生产”是三件事。
- 不绕过登录、WAF、CAPTCHA、付费墙、robots 或平台限制。
- 不把通用首页抓到的导航、营销文案或过期内容当作有效信号。
- 不把一次成功探测描述为 7/30 天稳定性验证。
- 不自动发布 LLM/模板生成的事实、投资结论或业务判断。
- 不为了 5,000 行目标复制代码、堆配置或引入第二套管线。

## 4. 用户流程

### 系统主人

1. 打开 Source Health，看到目录覆盖与有效观测覆盖。
2. 查看某来源最近 probe/collect 记录、失败分类、内容样本和质量趋势。
3. 对修复建议执行 retry、shadow、degrade、quarantine、restore 或 retire。
4. 查看管线漏斗，定位“有数据但不能发布”的原因。
5. 审核 evidence-ready Event 后生成静态快照。

### CEO / 投资负责人

1. 从 Today 和主线看到新发布且有证据的变化。
2. 进入详情查看事实、推断、观点、反证和置信度。
3. 沿公司、技术、商业和中国追赶关系理解连续变化，而非孤立新闻。

## 5. 验收指标

### 来源

- 全部目录项 100% 生成检查结果或明确 `policy_blocked/manual/restricted` 状态；
- E2 healthy 内容源达到 100+，E3 观察采集可独立启停、失败自动隔离、不会进入公开事实；
- 每个失败源有稳定错误分类和建议，不以自由文本代替；
- 批量检查不会因单源失败中止；
- active 来源具备真实成功运行，shadow 来源不会进入公开事实链；
- transient failure 不直接 retired；security/policy/drift 可进入 quarantine。

### 内容

- 建立各阶段漏斗和失败原因；
- URL、标题/正文指纹、近重复至少各有可测能力；
- 自动 Event 只有满足一手证据、内容完整和置信度门槛才进入 evidence-ready；
- 公开 Event 100% 有可点击 evidence；聚合站 primary evidence 为 0。

### 工程

- lint、typecheck、unit/integration、SQLite、隐私扫描和浏览器 smoke 全通过；
- 真实网络验证与 fixture 测试分开报告；
- GitHub Actions 成功运行且仓库快照可恢复；
- README/CHANGELOG/Capability Map 不过度承诺。

## 6. 每轮报告

每轮输出：目标、问题、根因、修改、能力/数据池、数据变化、页面变化、测试、遗留问题、下一轮。指标必须包含来源数、运行成功/失败、信号新增/重复、事件候选/evidence-ready/published、覆盖变化和公开页变化。
