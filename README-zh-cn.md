<p align="right">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="Agent Pulse — 证据驱动的 AI 行业认知与决策系统" />
</p>

<h1 align="center">Agent Pulse</h1>

> **Agent Pulse 是一个面向投资人、CEO、创业者和技术负责人的 AI 行业认知与决策系统：它把分散的官方发布、论文、资本动作、政策变化与社区信号，收敛为可验证的关键事件、趋势判断和下一步行动。**

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

## 为什么值得 Star

AI 行业从来不缺新闻、链接和观点。真正稀缺的是：快速知道什么发生了实质变化，理解它为什么重要，把它放进行业长期演进中，并形成自己的下一步判断。

Agent Pulse 希望解决的正是这件事：

- **30 秒：**知道今天最重要的变化；
- **3 分钟：**看懂证据、背景和受影响的角色；
- **10 分钟：**沿事件脉络、反向信号和下一观察点形成判断；
- **每天回来：**持续跟踪技术、AGI、商业化、投资、中国追赶和模型经济学，而不是重新阅读一遍新闻。

如果你也希望有一个开放、证据优先的 AI 行业认知产品，欢迎 [Star Agent Pulse](https://github.com/barretlee/agent-pulse)。Star 会帮助更多投资人、创业者和技术负责人发现它，也是支持公开版本持续维护最直接的信号。

## 你能获得什么

| 产品体验 | 它帮助你回答的问题 |
| --- | --- |
| **今日判断** | 今天发生了什么，我最应该先关注哪一件？ |
| **战略主线** | 这是一次孤立发布，还是行业趋势的延续或转折？ |
| **证据时间轴** | 事情最初如何出现，后来发生了什么，哪些说法已被验证？ |
| **研究前沿** | 哪些论文正在改变能力、评测、成本或产品方向？ |
| **中国与全球雷达** | 谁在领先、追赶、受限或加速出海？ |
| **星探机会** | 现在值得验证什么产品、创业、内容或组织内部实验？ |

[立即体验 Agent Pulse →](https://barretlee.github.io/agent-pulse/)

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

这个仓库不是产品 Mockup。它包含线上产品真实使用的信源目录、采集器、证据模型、自动质量门禁、静态渲染、信源健康自动化和 GitHub Pages 发布链路。

以下验证快照采集于 **2026-07-13 00:27 UTC**：

| 指标 | 验证状态 |
| --- | ---: |
| 当前目录信源 | 266 |
| 该次全量审计覆盖信源 | 260 |
| 该次全量审计 healthy | 139 |
| 隔离观察信源 | 107 |
| 生产信源 | 5 |
| 已公开的证据型事件 | 64 |
| 仓库快照中的规范化一手信号 | 2,187 |

完整数据可以查看机器生成的[信源健康报告](data/reports/source-health.json)、[数据源与评分原则](docs/SOURCES.md)和[能力图谱](docs/CAPABILITIES.md)。

当前不足也会明确写出来：生产晋级仍需要真实观察周期；不少历史事件还需要更多独立证据；Claim 级证据、跨语言语义聚类、MySQL 实机集成验证和用户结果反馈尚未完成。planned 或 experimental 能力不会被包装成已经交付。

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
npm run sources:audit         # 非破坏性全量信源审计
npm run ops:reconcile         # 协调信源健康与来源雷达状态
npm run scout:generate -- 5   # 自动上架或归档证据型星探机会
npm run export                # 在 dist/ 生成静态站
npm run check                 # lint、typecheck、测试与静态导出
```

本地开发可以不设置 `ADMIN_TOKEN`。所有非开发环境都必须使用高强度 token，并把 Control Room 放在私有访问控制之后。

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
