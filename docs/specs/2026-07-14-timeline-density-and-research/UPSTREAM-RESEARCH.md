# 上游研究：论文影响判断信源

## 结论

论文源与影响源必须分开。arXiv、论文 DOI 和作者主页用于确认论文身份与原始结论；它们不能证明论文已经产生影响。Timeline 的影响判断优先使用以下一手或开放权威接口，并保留来源 URL 与检查时间。

## 信源层级

| 目的 | 首选信源 | 使用方式 | 不能证明什么 |
| --- | --- | --- | --- |
| 直接发现 | OpenAI Research、Google Research / DeepMind、Anthropic Research、Microsoft Research | 官方研究发布、作者、论文与代码回链 | 实验室署名本身不等于长期影响 |
| 论文身份 | arXiv、Crossref DOI、出版方 | 标题、作者、发布日期、版本、DOI | 影响力与采用 |
| 学术影响 | OpenAlex、Semantic Scholar、Crossref Cited-by | 引用总量、近年引用速度、独立索引交叉核验 | 产业采用与结论正确性 |
| 同行认可 | OpenReview、会议 / 期刊官方页面 | venue、decision、公开评审与正式版本 | 仅“接收”不足以证明重大影响 |
| 代码采用 | GitHub 官方 REST API | 论文官方仓库的 stars、forks、release、持续维护 | stars 不是论文质量分 |
| 模型 / 数据采用 | Hugging Face 官方 Hub 数据、官方产品文档 | 下载、依赖、模型卡、数据集与产品采用 | 下载量可能受营销和重复请求影响 |
| 产业影响 | 产品、标准组织、监管机构、企业工程博客 | 明确采用关系、部署范围、性能或成本变化 | 发布方自述需要独立佐证 |

## 自动化约束

- OpenAI 与 DeepMind 的现有官方 Feed、Microsoft Research RSS、Google Research RSS 作为 Actions 的直接研究入口；新入口先以 shadow 采集验证，不绕过来源生命周期。
- OpenAlex 支持按 DOI 批量查询，Actions 使用有界批次、timeout、retry 和缓存；只保存允许公开的指标。它负责成熟论文影响，不是当年论文的唯一入口。
- Semantic Scholar 的 `citationCount` 与 `influentialCitationCount` 只作交叉核验，不在限流或缺少 API key 时偷偷降级为搜索结果页抓取。
- Crossref 的 `is-referenced-by-count` 只用于有 DOI 的论文，并明确它只覆盖 Crossref 已注册引用。
- OpenReview decision 需要绑定具体 venue 和公开 note；不能根据标题相似度猜测录用状态。
- GitHub 只查询论文官方或作者明确关联的仓库，不能把第三方复现仓库 stars 归给原论文。
- Google Scholar 没有稳定官方 API，不抓取页面，不作为 Actions 依赖。

## 判断原则

1. 先做身份匹配，再看指标；标题或 DOI 不一致直接隔离。
2. 使用论文年龄分层：成熟论文看引用与后续工作，当年论文看官方论文包、正式出版、代码 / 数据、部署与独立复现，避免与三年前论文比较绝对引用量。
3. 引用量、venue、stars、下载量都只是信号；至少一条强影响路径成立，且内容门禁通过，才进入 Timeline。
4. 人工覆盖必须记录证据、理由、审核时间和失效条件，并接受后续撤销。
5. 月份为空是正常结果，不触发补量任务。

## 2026 直接证据回填

首次修正选择 Microsoft Argos、OpenAI GABRIEL、Anthropic 劳动力影响研究、Google ReasoningBank、Google ERA、OpenAI Deployment Simulation 与 Anthropic Global Workspace。每项都同时绑定官方研究页与论文、出版物或代码，不从 arXiv 最新列表倒推月份数量。

## 官方资料

- OpenAlex Developers: https://developers.openalex.org/
- Semantic Scholar Academic Graph API: https://api.semanticscholar.org/api-docs/
- Crossref REST API: https://api.crossref.org/
- OpenReview API documentation: https://docs.openreview.net/
- GitHub REST API: https://docs.github.com/en/rest
- Hugging Face Hub API: https://huggingface.co/docs/hub/api
- OpenAI Research: https://openai.com/research/index/publication/
- Anthropic Research: https://www.anthropic.com/research
- Google Research RSS: https://research.google/blog/rss/
- Microsoft Research RSS: https://www.microsoft.com/en-us/research/feed/
