# 上游来源审计：AI HOT、HuggingNews 与 PriceAI

- 审计日期：2026-07-11
- 状态：公开资料审计，不代表获得数据授权或稳定性保证
- 原则：聚合站只用于发现、聚类提示或热度；事实必须回到原始来源

## 1. 审计方法

本轮只检查公开页面、公开 API/OpenAPI、公开仓库和数据许可说明，不登录、不绕过访问限制、不抓取受限生产数据。上游随时可能变化，接入前和定期运行中都应复核 robots、许可、API contract 与限流。

审计入口：

- AI HOT About：<https://aihot.virxact.com/about>
- AI HOT Agent 接入：<https://aihot.virxact.com/agent>
- AI HOT OpenAPI：<https://aihot.virxact.com/openapi.yaml>
- HuggingNews About：<https://huggingnews.com/about>
- PriceAI 仓库：<https://github.com/dimthink/PriceAI>
- PriceAI 数据与内容政策：<https://github.com/dimthink/PriceAI/blob/main/DATA_LICENSE.md>

## 2. AI HOT

### 2.1 公开定位

AI HOT About 将自身描述为 AI 信息聚合摘要和阅读索引，使用 AI 筛噪并保留值得阅读的内容，原文版权归各来源所有。这意味着它适合作为中文候选发现与聚合视角，不应替代原始事实源。

### 2.2 公开 API 契约

2026-07-11 检查的 OpenAPI 版本为 `1.3.1`，公开说明包括：

- 匿名只读 REST API；
- 脚本必须使用可识别、非浏览器伪装的 User-Agent；
- 定时同步优先轮询 `/api/public/fingerprint`；
- 只有 selected/all 指纹变化后再请求 `/api/public/items`；
- items 支持 ETag / `If-None-Match` / 304；
- `mode=selected|all`、category、since、take、opaque cursor、q 和 fields；
- 单 IP 持续配额 60 req/min，连续翻页建议间隔至少 1 秒；
- 429 应按状态码处理并退避 30–60 秒；
- items 默认只覆盖最近 7 天，更深历史走 daily/dailies；
- selected 会过滤重复/次要事件和未精选内容；
- API 可以提供第三方原文 URL 时，应保存该 URL 用于回源。

### 2.3 Agent Pulse 接入边界

允许的用途：

- 中文 AI 候选发现；
- AI HOT 自身精选/分类/聚类结果作为参考特征；
- aggregator score 作为补充特征，不直接等于 Agent Pulse 热度；
- 保存 AI HOT permalink 和它提供的原始 URL，建立 provenance chain。

禁止或限制：

- 不能把 AI HOT 作为重大事实的唯一证据；
- 不能把 AI HOT 多条记录计为多个独立事实来源；
- 不复制或公开其完整摘要库；
- 不做无条件高频 items 轮询；
- 不伪装浏览器 UA 或绕过限流。

### 2.4 当前实现差距

当前 `aihot` adapter 直接拉 `/api/public/items`；通用 fetcher 已处理 ETag/Last-Modified、304、429/`Retry-After` 和有界重试，采集结果只写 `source_discoveries`。尚未实现 fingerprint-first、per-query cache state、cursor 和 discovery/state 同事务提交，因此仍是基础接入，不能称为已经遵循完整公开契约。

### 2.5 目标调用序列

```text
schedule
  -> GET fingerprint with identifiable UA
  -> unchanged: finish lightweight run
  -> changed: GET items with query-specific If-None-Match
  -> 304: persist observed fingerprint only
  -> 200: validate schema -> normalize -> save discoveries/provenance
  -> commit discoveries + ETag + cursor + fingerprint atomically
```

## 3. HuggingNews

### 3.1 公开定位与上游

HuggingNews About 公开说明其 AI pipeline：

- 跟踪 X 账号、AI labs、companies、projects、reporters 和 researchers；
- 收集 posts、announcements、papers、filings、release notes、blog posts 等公开材料；
- 当多个来源指向新事件时形成 story；
- 编写紧凑、客观的 headline/short article；
- 展示 source material、source roles、quotes 和 original links；
- 明确偏好 primary sources，而不是 aggregators/commentary。

因此它的主要价值是海外尤其 X 语境下的事件发现、作者/帖子规模和原始来源编排，而不是独立的一手事实源。

### 3.2 接口状态

截至审计日期，About 页面仍写明 MCP、API 和 RSS “coming”。这意味着 Agent Pulse 不能把未公开的内部接口当成稳定 contract，也不能承诺正式 API 级 SLO。

### 3.3 Agent Pulse 接入边界

允许的用途：

- 低频读取公开页面必要 metadata；
- 记录事件标题、时间、公开 author/tweet counts、source roles 和 original links；
- 用作 X 传播域的 discovery/heat 信号；
- 正式 API/RSS 上线后，优先迁移到正式 contract。

禁止或限制：

- adapter 默认 disabled 或 shadow；
- 不复制完整 short article、quotes 或 source text；
- 不把 HuggingNews story 当成唯一事实证据；
- 不把页面 HTML 结构视为稳定 API；
- 不绕过 robots、WAF、登录或站点限制；
- parser 失配不能静默当成“健康但没有新闻”。

### 3.4 当前实现差距

当前 adapter 用公开首页发现 story，并低频读取最多 3 个详情页，从 Svelte 公开状态中提取 selected tweet URL、source/support role 和 handle；首页零匹配会触发 contract drift 错误，结果只写 `source_discoveries`。当前仍缺少：

- 全部 story 的原始 source links/source roles 提取；
- 比正则更稳健的 schema/DOM contract 与漂移基线；
- robots/政策复核记录；
- shadow SLO 和正式 API/RSS 迁移策略。

因此当前状态仍应标为 disabled/experimental，需要启用时先进入 shadow verification；未读取详情的 story 保持 `pending`，不能进入事实链。

## 4. PriceAI

### 4.1 公开定位

PriceAI 公开仓库将产品定位为 AI 获取与购买前比价雷达，覆盖：

- 官方订阅地区价；
- 第三方卡网/低价订阅；
- 官方 API / 模型 API；
- 中转 API 的倍率、稳定性和来源披露；
- 中转模型检测。

它明确区分官方基准、第三方报价、库存/新鲜度、充值倍率、模型倍率和风险边界。Agent Pulse 可借鉴这种分类方法，但不能因此获得其生产数据使用权。

### 4.2 数据许可边界

`DATA_LICENSE.md` 明确说明：仓库源码许可不等于生产数据许可。未经许可，不得批量复制、转售、再发布或用于运行竞争数据集的内容包括：

- production database exports；
- collected source/channel lists；
- raw or normalized offer data；
- price history、stock status、freshness data 和 crawl logs；
- manually reviewed classification results；
- user submissions、feedback 和 moderation notes。

政策还要求不要高频抓取、镜像完整数据集或把 PriceAI 当作替代数据 feed。短摘录、评论和带归属的回链是允许边界；商业托管等还需遵守仓库软件许可证的额外限制。

### 4.3 Agent Pulse 接入策略

当前允许：

- 在模型资源区提供明确归属的 PriceAI 外链；
- 说明它是第三方购买前参考，不是 Agent Pulse 的官方价格源；
- 借鉴官方/第三方、价格/库存/倍率/风险分离的产品分类；
- 从 OpenAI、Anthropic、Google、DeepSeek、阿里云等厂商官方页面独立采集官方价格基准；
- 保留 PriceAI 的项目和许可链接。

当前禁止：

- 批量抓取或镜像 priceai.cc 生产价格、渠道、库存和历史；
- 复制其维护的 source/channel list 作为 Agent Pulse 数据源目录；
- 在 fixture、seed 或公开静态 JSON 中嵌入其生产快照；
- 把第三方渠道包装为官方入口；
- 在未获书面许可或正式 API 前启用 PriceAI 数据 adapter。

未来只有满足以下任一条件才重新评审数据接入：

1. PriceAI 提供明确允许 Agent Pulse 使用的正式 API 与条款；
2. 获得书面授权，明确字段、频率、缓存、再发布和归属范围；
3. 使用双方认可的公开数据交换格式，并通过合规评审。

## 5. 三个上游在证据链中的角色

| 上游 | 主要价值 | 可计事实证据 | 可计热度 | 默认状态 |
| --- | --- | --- | --- | --- |
| AI HOT | 中文候选发现、精选、分类、聚类参考 | 否，必须回原始 URL | 是，作为补充 | shadow/active 需完成公开 API 契约 |
| HuggingNews | 海外/X 事件发现、作者与帖子规模、原始链接编排 | 否，必须回原始 URL | 是，作为 X 域补充 | disabled/shadow |
| PriceAI | 模型购买分类、第三方比价入口、风险口径 | 仅其自身产品说明；模型价格仍需厂商回源 | 不用于行业热点 | external-link only |

## 6. 回源验收

聚合来源生成的每条候选必须保存：

- aggregator name、item ID、permalink 和 observedAt；
- original URL、original domain 和 canonical URL；
- 原始来源角色：公告、论文、release、帖子、媒体验证等；
- 当前匹配状态：pending、candidate、matched_source、merged_signal；后续验证状态再扩展 verified、broken、restricted、conflicting；
- 最后验证时间和验证方法。

发布门槛：

- `verified` 的 Tier 1 原始证据至少一个，或相互独立 Tier 2 至少两个；
- `pending/broken/restricted` 不能单独支撑公开事实；
- 聚合站计入 heat/discovery，但 primary evidence count 必须为 0；
- 原始链接失效时保留 provenance，并将事件送回审核，不静默替换为聚合摘要。

## 7. 复审频率

- OpenAPI/RSS contract：每月或发生解析失败时复审；
- robots/license/content policy：每季度及每次接入升级前复审；
- HTML metadata adapter：每周运行 drift probe；
- PriceAI 数据授权：默认视为未授权，只有新条款或书面许可时重新评审。
