<p align="right">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="Agent Pulse — 证据驱动的 AI 行业认知与决策系统" />
</p>

<h1 align="center">Agent Pulse</h1>

> **给需要做判断的人，而不只是追新闻的人。** Agent Pulse 把官方发布、论文、资本动作、政策变化与公开传播信号，收敛为可追溯的 Event、持续演进的行业判断，以及明确的下一验证信号。

<p align="center">
  <a href="https://barretlee.github.io/agent-pulse/"><strong>打开 Agent Pulse</strong></a>
  · <a href="https://github.com/barretlee/agent-pulse"><strong>⭐ Star 这个项目</strong></a>
  · <a href="README.md"><strong>English README</strong></a>
</p>

<p align="center">
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/ci.yml?branch=main&style=flat-square&label=CI" alt="CI 状态" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/data-refresh.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/data-refresh.yml?style=flat-square&label=data%20refresh" alt="数据刷新状态" /></a>
  <a href="https://github.com/barretlee/agent-pulse/actions/workflows/source-audit.yml"><img src="https://img.shields.io/github/actions/workflow/status/barretlee/agent-pulse/source-audit.yml?style=flat-square&label=source%20audit" alt="信源审计状态" /></a>
  <a href="https://github.com/barretlee/agent-pulse/releases/latest"><img src="https://img.shields.io/github/v/release/barretlee/agent-pulse?style=flat-square" alt="最新版本" /></a>
  <a href="https://github.com/barretlee/agent-pulse"><img src="https://img.shields.io/github/stars/barretlee/agent-pulse?style=flat-square&logo=github" alt="GitHub Stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code%20license-MIT-2dd4a8?style=flat-square" alt="MIT 代码许可证" /></a>
</p>

## 从信号到判断

AI 行业从来不缺新闻、链接和观点。对投资负责人、CEO、创业者、业务负责人和技术负责人来说，真正稀缺的是可靠回答三个问题：

1. **什么发生了实质变化？** 不是每次发布都值得更新判断。
2. **为什么重要？** 事实只有连接到长期行业变化和受影响角色，才具备决策价值。
3. **什么会改变当前判断？** 每个可持续的判断都需要下一信号、反向信号或失效条件。

Agent Pulse 围绕这个闭环工作：广泛观察、选择性发布、保留证据脉络，并且只在证据变化时更新判断。

如果你也希望这样的公开情报基础设施持续存在，欢迎 [Star Agent Pulse](https://github.com/barretlee/agent-pulse)。Star 会帮助更多决策者和建设者发现它，也是支持开放版本持续维护最直接的信号。

## 直接体验产品

| 产品界面 | 它帮助你回答的问题 | 当前边界 |
| --- | --- | --- |
| [**关键变化**](https://barretlee.github.io/agent-pulse/) | 什么新证据足以重新审视当前判断？ | 公开判断绑定证据，按事件变化而不是内容配额更新。 |
| [**六个趋势视角**](https://barretlee.github.io/agent-pulse/lines/) | 这是一次孤立发布，还是能力、产品、基础设施、资本或全球格局变化的一部分？ | 各视角共享 Event 证据，不复制事实。 |
| [**证据时间轴**](https://barretlee.github.io/agent-pulse/timeline/) | 事情最初如何出现，后来发生了什么，哪些一手来源支持它？ | 每个已公开 Event 都回链公开证据。 |
| [**来源动态**](https://barretlee.github.io/agent-pulse/signals/) | 目录信源在收敛为 Event 之前，正在发布哪些信号？ | 这里只是 allowlist 观察层，不等于已核验事实。 |
| [**覆盖与来源**](https://barretlee.github.io/agent-pulse/sources/) | 哪些领域覆盖较强、较弱、已激活、隔离观察或受限？ | 目录收录、有效观测和生产晋级分开表达。 |
| [**星探精灵**](https://barretlee.github.io/agent-pulse/scout/) | 哪些产品、研究、内容或组织实验可能值得验证？ | Scout 仍是 experimental，只输出证据型假设，不输出事实或投资结论。 |

[从最新关键变化开始 →](https://barretlee.github.io/agent-pulse/)

## 它不是另一个新闻聚合器

每个公开事件都会尽量分清六个层次：

1. **事实**：发生了什么，时间是什么；
2. **证据**：对应的官方发布、论文、监管文件或原始资料；
3. **背景**：此前发生过什么，这次真正改变了什么；
4. **影响**：对技术、业务、资本和政策分别意味着什么；
5. **判断**：当前应该如何理解，并明确保留不确定性；
6. **下一信号**：什么证据会加强、削弱或推翻当前判断。

```text
官方发布 + 论文 + 监管文件 + 专家与传播信号
                         │
                         ▼
      采集 → 规范化 → 去重 → 聚类 → 绑定证据
                         │
                         ▼
      确定性门禁 → 战略主线 → 下一信号 → 公开事件
```

聚合站只能提供候选发现和传播线索，不能成为重大事实的唯一证据。外部文字不会作为可信 HTML 执行，私有运营数据也不会进入公开静态站。

## 真实运行，也诚实展示边界

这个仓库不是产品 Mockup。它包含线上产品真实使用的信源目录、采集器、证据模型、自动质量门禁、静态渲染、信源健康自动化和 GitHub Pages 发布链路；同时刻意区分四种状态：**已收录、已观测、已激活、已发布**。

GitHub Actions 每天刷新一次公开数据并重新部署静态站；来源审计、健康监控和质量守卫保持周更。`weekly-brief` Issue 只在周日或显式手动触发、且本周至少有一个公开 Event 通过门禁时创建或更新，因此每日保鲜不会制造每日或空白 Issue。

仓库证据核验于 **2026-07-14**。下表信源健康数据来自 **2026-07-13 16:59 UTC** 完成的全量审计，内容数量来自版本化仓库快照。

| 指标 | 验证状态 |
| --- | ---: |
| 当前目录信源 | 411 |
| 该次全量审计覆盖信源 | 411 |
| healthy / degraded / failed / skipped | 259 / 28 / 71 / 53 |
| 可访问 endpoint / 实际返回内容 | 397 / 270 |
| active 生产信源 | 5 |
| 已公开的证据型事件 | 109 |
| 仓库快照中的规范化 Signal | 4,417 |

完整数据可以查看机器生成的[信源健康报告](data/reports/source-health.json)、[数据源与评分原则](docs/SOURCES.md)和[能力图谱](docs/CAPABILITIES.md)。

公开来源观察流只输出标题、归属、时间、分类、标签与 canonical 链接等 allowlist 字段；它仍属于观察层，不能绕过 Event 的证据与 readiness 门禁。当前不足也会明确写出来：生产晋级仍需要真实观察周期；不少历史事件还需要更多独立证据；Claim 级证据、跨语言语义聚类、MySQL 实机集成验证和用户结果反馈尚未完成。planned 或 experimental 能力不会被包装成已经交付。

## 系统如何工作

```text
信源与发现线索
      │
SourceAdapter 统一边界
      │
安全拉取 → 规范化 → 质量门禁 → 去重
      │
隔离观察 / Event 聚类
      │
证据绑定 → 确定性发布门禁
      │
  ┌───┴───┐
  ▼       ▼
Control Room   隐私安全静态站 → GitHub Pages
```

默认数据库是零配置的 SQLite。项目存在 MySQL 方言路径，但在完成真实集成测试前不会宣称 MySQL 已兼容。公开 Pages 只包含 allowlist DTO；数据库、凭证、原始 payload、代理设置和私有备注不会导出。

进一步阅读：[系统架构](docs/ARCHITECTURE.md)、[产品路线图](docs/ROADMAP.md)、[版本记录](CHANGELOG.md)。

## 本地运行

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

- 公开站：<http://127.0.0.1:8899/>
- 私有 Control Room：<http://127.0.0.1:8899/admin/>
- 健康检查：<http://127.0.0.1:8899/api/health>

常用命令：

```bash
npm run collect               # 采集、去重、聚类与评分
npm run ai:enrich             # 显式启用后收敛符合条件的 review Event
npm run sources:audit         # 非破坏性全量信源审计
npm run weekly:issue          # 渲染当前公开周报
npm run ops:reconcile         # 协调信源健康与来源雷达状态
npm run scout:generate -- 5   # 自动上架或归档证据型星探机会
npm run export                # 在 dist/ 生成静态站
npm run check                 # lint、typecheck、测试与静态导出
```

本地开发可以不设置 `ADMIN_TOKEN`。所有非开发环境都必须使用高强度 token，并把 Control Room 放在私有访问控制之后。

AI 辅助 Event 收敛和周报草拟仍是 **experimental，本地默认关闭**。只把 `DEEPSEEK_API_KEY` 放入已忽略的本地 `.env` 或 GitHub Actions Secret，并通过 `AI_ENRICHMENT_ENABLED=true` 显式启用；`.env.example` 不应出现真实凭据。模型只接收裁剪后的规范化 Evidence 或公开静态 DTO，Schema、证据、readiness 与发布门禁仍由确定性程序执行。

## 参与贡献

最有价值的贡献包括：稳定的信源 adapter、parser fixture、论文与 benchmark 覆盖、证据质量改进、失败隔离测试，以及更清晰的产品表达。

- 代码修改：[CONTRIBUTING.md](CONTRIBUTING.md)
- 信源建议与内容纠错：[信源贡献指南](docs/CONTRIBUTING_SOURCES.md)
- 社区规则：[社区行为准则](CODE_OF_CONDUCT.md)
- 安全问题：[SECURITY.md](SECURITY.md)

如果 Agent Pulse 帮助你用更少的信息负担形成更清晰的判断，欢迎 [⭐ Star 这个项目](https://github.com/barretlee/agent-pulse)，也欢迎直接复制 README 顶部的一句话介绍进行分享。

## 许可证与责任边界

[MIT License](LICENSE) 适用于 Agent Pulse 源代码和项目原创仓库文档，文件另有说明的除外。它不授予第三方文章、论文、Release Notes、商标、图片、Feed 或其他来源材料的使用权。公开情报只包含有限 metadata、来源归属、canonical 链接和 Agent Pulse 原创收敛。

详见[版权、来源与责任边界](docs/LEGAL.md)和[第三方声明](THIRD_PARTY_NOTICES.md)。Agent Pulse 提供研究与决策辅助信息，不构成投资、法律、采购或其他专业建议。

[MIT](LICENSE) © 2026 Barret Lee
