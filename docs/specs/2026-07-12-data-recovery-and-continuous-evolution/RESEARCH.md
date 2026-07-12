# RESEARCH：2026-07-12 基线审计

## 1. 仓库状态

本轮开始时 `main` 位于 `e20b1be`，工作区已有未提交的 v0.5 在途实现。为保护用户工作，本轮不回滚这些文件，而是在验证后继续或修正。

### 数据

| 指标 | 基线 |
|---|---:|
| Source catalog | 195 |
| Active | 6 |
| Shadow | 189 |
| Snapshot signals | 253 |
| Snapshot discoveries | 30 |
| Snapshot events | 234 |
| Published events | 36 |

### 在途 adapter 映射

| Adapter | 数量 | 风险 |
|---|---:|---|
| rss | 68 | 部分 acquisition/manual 被宽泛映射，需真实 probe |
| web-scraper | 100 | manual/social 也被映射，存在合规和假成功风险 |
| github-releases | 25 | 必须确认都是 repository URL |
| aihot | 1 | 只能 discovery/heat |
| huggingnews | 1 | 应保持 shadow/restricted |

## 2. 工程验证

- `npm run typecheck`：通过；
- `npm test`：21 files / 160 tests 通过；
- `npm run lint`：38 error、18 warning、4 info；
- admin health 页面：代码包含自引用初始化，浏览器运行会失败；
- `CHANGELOG` 写有 32 active、117 verified、126 tests，与当前可复现结果不一致。

## 3. 主要代码风险

### Activation

`activate` 顺序访问来源，单次 connectivity + collect 成功后即可 active。它没有 7/30 天 SLO、policy/fixture/contract/人工抽检证据，也没有结构化持久 check，因此不能作为生产晋级器。

### Adapter fallback

目录把剩余 manual/social/html 全部映射为 `web-scraper`。这会把静态首页、导航页、JS shell 或受限制社交页误判成可采集源。adapter 应由 acquisition 与来源 package 明确声明，不应存在 catch-all 生产映射。

### Proxy

在运行时设置 HTTP_PROXY/HTTPS_PROXY 不足以证明 Node native fetch 已切换 dispatcher；即使网络可达，也不能绕过来源访问政策。需显式、可测试、不可泄露的代理策略。

### Quality

质量评分尚未接入 collect/persist/publish；freshness 对历史回填不适用；存在 lint 问题和未使用参数。当前只能视为纯函数原型。

### Discovery

候选从 signals.raw metadata 提取，但正式 collector 会清理/变化 rawMeta；自动保存 draft 缺少 robots/license、身份和 shared-host 细分。可作为 proposal，不应自动晋级。

### Monitor

目前主要从 sources 当前行汇总，缺少 source_checks 历史、成功率窗口、duplicate、freshness、parse/schema 和质量趋势。所谓“自适应修复”不能只触发 collect。

## 4. 第一轮选择

最高价值问题不是立即增加 public Event，而是建立可靠的全目录检查面。没有它，任何“恢复百分比”“新增 active 数”都无法验证，并会把解析错误、低质量和合规问题混在一起。

第一轮因此优先：

1. source_checks 与结构化诊断；
2. probe/collect/lifecycle 分离；
3. adapter 映射纠偏；
4. 后台检查面；
5. 195 源真实基线。

后续根据失败簇而不是来源名单逐个写重复修复代码。

## 5. 四轮全目录真实检查

所有轮次都使用独立 SQLite，覆盖同一份 195 源目录；probe 不写正式 Signal，也不改变来源生命周期。

| 指标 | Round 1 | Round 2 | Round 3 | Round 4（代理回退） |
|---|---:|---:|---:|---:|
| healthy | 59 | 60 | 62 | 68 |
| degraded | 19 | 23 | 23 | 28 |
| failed | 82 | 76 | 70 | 56 |
| skipped/manual/policy | 35 | 36 | 40 | 43 |
| accessible | 161 | 163 | 157 | 185 |
| fetched | 132 | 140 | 141 | 163 |
| with content | 66 | 66 | 69 | 77 |

Round 4 有 52 个来源真实使用 `EnvHttpProxyAgent`，31 个达到 healthy。代理只在 direct network/timeout 后使用；HTTP 401/403/404、SSRF/security 和 restricted policy 不触发代理绕过。公开报告只记录 boolean 和诊断，不包含代理地址或认证信息。

已确认修复：

- Qwen：失效 `atom.xml` → 官网声明的 `blog/index.xml`，44 items；
- MLCommons：失效 `/news/` HTML → 官网声明 `/feed/`，12 items；
- LlamaIndex：失效 blog RSS → 官方 GitHub releases，10 items；
- Menlo：识别卡片中显式英文日期，0 valid → 12 valid，保持 partial/degraded；
- Hugging Face：直连失败后代理恢复 50 items。

无稳定公开接口或页面 contract 的 a16z、Sequoia、Bessemer、NFX、White House OSTP 和 TLDR 被明确标记为 manual；这会增加 skipped，但不会用假数据降低失败数。

第五轮将同一审计真正落到正式运行数据库，并包含 1 个保留的 retired 历史来源。结果为 196/196 已检查、68 healthy、28 degraded、56 failed、44 skipped、186 accessible、164 fetched、77 with content。浏览器验收由此发现并修复“独立审计报告完整、管理台只有 65/196”的观测断层；正式后台现在显示完整的 196/196 最新状态。

## 6. 发布漏斗根因与纠偏

真实进化第一轮处理 200 条 backlog 时，仅 8 条合并，却新建 192 个 Event。说明原实现把“信号已处理”等同于“形成可叙事事件”，是页面稀疏和后台噪声的主要根因。

加入 eventability、deferred triage、模型 family/facet 和可逆 review noise suppression 后：

| 指标 | 纠偏前 | 纠偏后第二轮 |
|---|---:|---:|
| signals | 636 | 637 |
| untriaged backlog | 141 | 0 |
| deferred signals | 0 | 533 |
| events | 485 | 90 |
| review placeholders | 441 | 46 |
| published | 44 | 44 |
| multi-source events | 1 | 3 |
| event→published | 9.07% | 48.89% |
| readiness | 6.60% | 35.56% |

deferred 不等于删除：Signal 保持原样，triage 保存原因、eventability 和被抑制的占位 Event 快照。新的一手事件出现时，deferred 信号可重新匹配并补强证据。

## 7. 运行时治理修复

- seed 只刷新目录 metadata，不再覆盖 lifecycle、enabled、state、cursor 和成功/失败计数；
- 13 个旧版单次成功后自动激活的来源不满足 20 次 healthy / 7 天观察窗，已显式回到 shadow，历史 Signal 保留；
- 48 条历史 AI HOT 聚合器 Signal 均未挂载 Event，备份后清理；聚合发现记录仍保留；
- publish API 增加内容、主线、实体、primary evidence、置信度和热度证据门禁；
- `evolve` 默认不自动激活、发布、保存候选或导出，显式循环才执行对应动作。
