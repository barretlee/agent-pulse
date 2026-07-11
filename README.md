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

Agent Pulse 把原始内容保留在后台证据层，公开页只展示已经聚类、评分、收敛和审核的 Event。

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
- 信源启停、层级、权威分与适配器配置；
- 事件编辑、审核、置顶、发布和隐藏；
- 主线颜色、顺序和叙事定义；
- 国内外角色的“上牌桌”评分；
- 模型资源、风险等级和核验状态；
- 首页区块、默认主线、密度、主题 token 和筛选阈值。

## 技术栈

- Node.js + TypeScript
- Fastify + Zod
- Kysely + SQLite（默认）/ MySQL（可选）
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

## 数据源原则

1. 官方 API / RSS / Atom / GitHub Releases；
2. 官方公开 JSON 或稳定 metadata；
3. 聚合器公开 API，只作发现与交叉验证；
4. 符合 robots、低频且只取必要元数据的公开页面；
5. 需要绕过登录、付费墙、验证码或平台限制的来源默认不接。

AI HOT 使用其公开 API、fingerprint/ETag 契约；HuggingNews 当前没有正式 API/RSS，因此对应适配器默认关闭，只预留低频元数据能力。更多见 [数据源与评分](docs/SOURCES.md)。

## 安全与隐私

- `.env`、数据库、token、cookie、原始 payload 和本机路径不会进入 Git；
- 导出器使用公开字段 allowlist，不复制数据库行；
- 外部请求有超时、响应体上限和 SSRF 私网防护；
- 管理 API 使用 bearer token 与常量时间比较；
- 所有外部文字用 `textContent` 渲染，不执行来源 HTML。

漏洞报告请阅读 [SECURITY.md](SECURITY.md)。

## 项目状态

当前是可运行的第一阶段基础设施：SQLite/MySQL 数据层、统一采集、事件聚类、评分、管理台、多主线静态站点、测试与 Pages 发布链路均已建立。下一阶段重点是中文社交热度接入、跨中英文实体对齐、主线拖拽编排和可选 LLM 收敛器。

完整设计与验收记录在 [`docs/specs/2026-07-11-agent-pulse-rebuild/`](docs/specs/2026-07-11-agent-pulse-rebuild/README.md)。

## License

[MIT](LICENSE) © Barret Lee

