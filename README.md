<p align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="Agent Pulse — AI industry intelligence timelines" />
</p>

<h1 align="center">Agent Pulse</h1>

<p align="center">
  <strong>Signal, not noise.</strong><br />
  把 AI 发布、论文、观点、资本和扩散信号，收敛成可理解、可验证、可行动的行业认知主线。
</p>

<p align="center">
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://barretlee.github.io/agent-pulse/"><img src="https://img.shields.io/badge/live-GitHub%20Pages-8b5cf6?style=flat-square" alt="Live demo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2dd4a8?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A522-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 22+" />
</p>

<p align="center">
  <a href="https://barretlee.github.io/agent-pulse/">在线体验</a> ·
  <a href="#它解决什么问题">产品理念</a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="docs/ARCHITECTURE.md">架构</a> ·
  <a href="docs/CAPABILITIES.md">能力图谱</a> ·
  <a href="docs/ROADMAP.md">Roadmap</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="docs/SOURCES.md">数据源</a> ·
  <a href="CONTRIBUTING.md">贡献</a>
</p>

## 它解决什么问题

行业信息的稀缺点早已不是“链接不够多”，而是：

- 同一件事被几十个账号和媒体重复转述，事实与观点混在一起；
- 单一平台的声量被误认为全球热点；
- 模型发布、技术路线、资本动作和商业化没有被放进同一条因果主线；
- 国内厂商的追赶、并跑和领先缺乏持续、可验证的角色时间轴；
- 读完新闻依然不知道 CEO、投资负责人或业务团队应该做什么。

Agent Pulse 的目标是把原始内容保留在后台证据层，公开页只展示已经聚类、评分、收敛和审核的 Event。当前在线内容是用于验证产品形态的人工精选样例，不代表已经建立真实、持续的全网热点监测。

```text
一手事实 + 专家洞察 + 跨平台热度
                │
                ▼
      去重 → 聚类 → 可信/热度/影响评分
                │
                ▼
  技术 / AGI / 投资 / 商业化 / To C·B·D·G 主线
                │
                ▼
     行业判断 · 未来观察 · 业务动作 · 证据链
```

## 核心能力

### 多主线行业时间轴

同一个事件可以同时成为“技术演进”“AGI 进展”“To D 商业化”和“中国追赶”的节点。事件事实只有一份，叙事视角可以组合，避免信息孤岛。

### 可解释的热点判定

可信度和热度是两个分数。真正的热点需要高可信事实、多个独立来源、跨平台传播、地区宽度、扩散速度和持续性，单个大 V 或单平台榜单不直接等于热点。

### CEO / 投资负责人视角

每个公开事件固定收敛为：一句话事实、核心摘要、技术洞察、行业判断、业务价值、未来观察和证据链。先看战略与资本含义，再下钻技术细节。

### 中国牌桌角色雷达

内置模型厂商、云厂商、芯片公司、Agent/开发者生态和应用大厂角色目录。角色分数不是排名宣传，而是由能力、生态、商业、算力和政策证据持续校准。

### 模型获取与成本入口

区分官方订阅、官方 API、云平台和第三方参考，保留购买入口、价格证据、地区、风险与核验时间。项目会链接 [PriceAI](https://priceai.cc) 做进一步购买前比价，但遵守其数据许可，不镜像受限生产数据。

### Control Room 管理台

后台可控制：

- 采集、聚类、评分和静态化流水线；
- 信源健康、逐次运行、验证、启用、降级、隔离、恢复、软退役与单源拉取；
- 事件编辑、审核、置顶、发布和隐藏；
- 主线颜色、顺序和叙事定义；
- 国内外角色的“上牌桌”评分；
- 模型资源、风险等级和核验状态；
- 星探候选生成、接受、忽略、归档和人工发布；
- 来源覆盖、质量、稳定性、置信度、价值、实时性、时效性、效果与治理评测；
- 视图 JSON 已可保存，但公开页对全部视图配置的消费仍在建设中。

### 星探精灵（experimental）

星探从已发布事件中提出创业、内容和工作机会，给出 Why now、反证、48 小时行动与可沉淀产物。领域对象严肃可审计，精灵只是交互人格；候选默认进入私有 inbox，只有人工接受并发布的卡片才进入静态站。

### Capability Map 与系统评测

Agent Pulse 把能力沉淀与页面呈现分开管理。当前维护 36 项 sensing / understanding / intelligence / experience / delivery / governance 能力，每项记录状态、成熟度、首次 release 与实现证据。后台 Evaluation Center 从 10 个维度生成 Scorecard，包含一手来源归属；样本不足会明确标注且不参与综合分。详见 [能力图谱](docs/CAPABILITIES.md)。

## 技术栈

- Node.js + TypeScript
- Fastify + Zod
- Kysely + SQLite（默认）/ MySQL 方言路径（尚待真实 MySQL 集成验证）
- 原生 HTML/CSS/JavaScript 静态前台与管理台
- Vitest + Biome
- GitHub Actions + GitHub Pages

公开页没有运行时框架依赖，最终只发布 `index.html + assets/ + data/`。

## 快速开始

需要 Node.js 22 或更高版本。

```bash
git clone https://github.com/barretlee/agent-pulse.git
cd agent-pulse
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

访问：

- 公开页：<http://127.0.0.1:8899/>
- 管理台：<http://127.0.0.1:8899/admin/>
- 健康检查：<http://127.0.0.1:8899/api/health>

开发环境未设置 `ADMIN_TOKEN` 时允许本地管理；production 必须提供长度至少 16 位的 token。

## 常用命令

```bash
npm run dev          # 启动本地服务与管理台
npm run collect      # 采集 + 去重 + 聚类 + 评分
npm run export       # 生成 dist/ 静态站点
npm run check        # lint + typecheck + tests + export
npm run build        # 编译服务端 TypeScript
```

切换 MySQL：

```bash
DATABASE_URL='mysql://user:password@127.0.0.1:3306/agent_pulse' npm run db:migrate
```

## 数据源原则与事实回源

1. 官方 API / RSS / Atom / GitHub Releases；
2. 官方公开 JSON 或稳定 metadata；
3. 聚合器公开 API，只作发现与交叉验证；
4. 符合 robots、低频且只取必要元数据的公开页面；
5. 需要绕过登录、付费墙、验证码或平台限制的来源默认不接。

聚合站只用于候选发现、聚类提示或传播热度，不能作为重大事实的唯一证据。聚合条目必须尽可能回到公司公告、论文、监管文件、官方 release 或独立专业验证；无法回源的内容只能停留在候选/待审状态。

v0.4.0 的 Source Catalog 包含 **195 个**高价值候选源，覆盖 14 类、54 个中国来源与 141 个全球/海外来源。目录不等于全部已经接入：当前只启用 6 个，其余按 candidate / manual / restricted 进入验证队列，必须通过 contract fixture 与 shadow run 才能晋级。

AI HOT 当前使用其公开 items API，把条目的原始 URL 解析为来源发现；HuggingNews 从公开首页与少量详情页提取传播簇、关键账号和原帖 URL。两者都只写入 `source_discoveries`，不会直接创建事实 Signal。通用条件请求已保存 ETag/Last-Modified，fingerprint 增量协议仍待完整实现。PriceAI 仅作为明确归属的外部比价入口，未获书面许可或正式 API 前不批量采集其生产价格、渠道、库存或历史数据。

完整的上游审计、PriceAI 数据许可边界和来源发现晋级规则见[上游来源审计](docs/specs/2026-07-11-source-platform-and-scout/UPSTREAM-RESEARCH.md)与[数据源平台 PRD](docs/specs/2026-07-11-source-platform-and-scout/PRD.md)，当前来源分层见[数据源与评分](docs/SOURCES.md)。

## 两年行业主线与持续发布

v0.4.0 建立了 **2024-07-01 至 2026-07-11** 的第一版 AI 行业基线：30 个一手来源历史里程碑与 6 个近期节点，覆盖技术、AGI、投资、商业化、产品、To C / To B / To D / To G 和中国追赶。目标不是补齐新闻数量，而是建立能看清阶段变化的高密度认知主线。

历史事件全部回链官方发布、官方代码仓库或监管文件；AI HOT、HuggingNews 等聚合站只用于候选发现和传播线索。缺少可比社交数据时，历史节点 `heatScore` 保持 0，不使用今天的累计指标或人工默认分伪造历史热点。

系统已经输出 5 个行业阶段与 6 条高层主线总结；更细的月度 Pulse、季度 Phase、25 个月 coverage matrix、claim-level evidence 和双时间视角仍在后续建设中。

GitHub Actions 每 6 小时恢复 `data/snapshot/v1.json`，执行采集与聚类；快照发生实质变化时，由 Actions bot 提交到仓库并显式触发 Pages。SQLite、原始 payload 和敏感配置不会进入 Git。定时生成的新事件保持 `review`，不会绕过人工门禁自动公开。

完整设计与后续缺口见[两年行业情报回溯 PRD](docs/specs/2026-07-11-two-year-intelligence-and-continuous-publish/PRD.md)、[系统设计](docs/specs/2026-07-11-two-year-intelligence-and-continuous-publish/SYSTEM.md)和[实施清单](docs/specs/2026-07-11-two-year-intelligence-and-continuous-publish/TASKS.md)。

## 安全与隐私

- `.env`、数据库、token、cookie、原始 payload 和本机路径不会进入 Git；
- 导出器使用公开字段 allowlist，不复制数据库行；
- 外部请求有超时、有限重试、退避抖动、逐跳重定向检查、流式响应体上限和 SSRF 私网防护；
- 管理 API 使用 bearer token 与常量时间比较；
- 所有外部文字用 `textContent` 渲染，不执行来源 HTML。

漏洞报告请阅读 [SECURITY.md](SECURITY.md)。

## 项目状态

当前约为 **Stage 1.2 / 5：可演示骨架**，正在进入 Stage 2 foundation。Node/TypeScript、SQLite、统一适配器、Event/Track/Actor 模型、本地管理台、静态站和 Pages 外壳已经存在；但真实跨平台热点、国内外来源覆盖、自动认知收敛、后台到 Pages 的运营发布闭环、MySQL 实机 CI 和 claim 级证据仍未达到生产标准。

本轮新增了来源 lifecycle/health/policy、SourceRun、有界并发、瞬时错误重试、条件请求、自动降级/隔离、聚合上游发现、一手事实门禁，以及证据型星探 v1。这些是 Source OS 和个人机会层的底座，不等于来源平台已经成熟。完整的 Stage 1–5 水位、退出指标与未完成项见 [`数据源平台与星探规格`](docs/specs/2026-07-11-source-platform-and-scout/README.md)。

两年高价值里程碑、阶段总结和仓库 JSON snapshot 已有基础实现；Document/Observation 分层、claim-level evidence、完整 coverage matrix 和 approved snapshot 回滚仍处于规格阶段，不计入 operational 能力。

产品内置 Evolution Spine，直接呈现 [State 1–5 Roadmap](docs/ROADMAP.md)、Capability Map 和 [Changelog](CHANGELOG.md)，让每次迭代展示的是新增处理/分析/挖掘能力及证据，而不只是 UI 变化。

第一轮重构记录在 [`docs/specs/2026-07-11-agent-pulse-rebuild/`](docs/specs/2026-07-11-agent-pulse-rebuild/README.md)，其中部分条目是目标设计，不应被理解为已经通过生产验证。

## License

[MIT](LICENSE) © Barret Lee
