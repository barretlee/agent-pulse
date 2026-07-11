# 数据源平台与星探精灵测试计划

- 状态：Proposed
- 原则：测试项没有通过前，不得在 README/TASKS 中宣称对应能力已实现。

## 1. Source Package Contract

每个 source package 复用同一套 contract suite：

- manifest、config schema、state schema 可解析；
- `probe` 不产生正式 signal，不推进 cursor；
- 正常响应规范化为统一 signal，保留 original/aggregator provenance；
- 缺字段、错类型、未知 schema version 给出可诊断错误；
- 相同输入输出稳定，重复运行保持幂等；
- fixture 不含 token、cookie、私有数据或完整第三方正文；
- adapter version 升级能迁移旧 state；
- disable/uninstall 后不再调度，但历史证据可读取。

## 2. Fetch 安全与稳定性

### 单元/集成场景

- DNS 解析到 IPv4/IPv6 loopback、private、link-local、multicast 时拒绝；
- 公网 URL 302 到私网时逐跳拒绝；
- 多次 redirect、循环 redirect 和 scheme change 被限制；
- URL 中 username/password 被拒绝；
- DNS rebinding 模拟不会绕过实际连接校验；
- connect timeout、total timeout 可区分；
- 超过 body limit 时流式中止，不先读完整响应；
- content-type 与 payload 不符时隔离；
- 408/429/502/503 按策略重试，400/401/403/404 不盲目重试；
- `Retry-After` 优先于本地 backoff，jitter 在配置范围；
- 日志不会输出 token、cookie、完整 payload。

### 并发与租约

- `COLLECTOR_CONCURRENCY` 真正限制同时运行数；
- domain/source rate budget 生效；
- 同一 source 同一窗口只有一个 lease；
- 超时 lease 可安全回收；
- backfill 不阻塞实时优先队列。

## 3. Cursor、缓存与原子性

- 200 响应保存 ETag/Last-Modified/cursor/fingerprint；
- 304 不解析 body，不重复写 signal；
- fingerprint 未变化时不请求昂贵 items endpoint；
- 相同 query 组合拥有独立 ETag；
- collector 或数据库失败时不推进 state；
- signal、source run 和 nextState 同事务提交；
- cursor 失效回首屏不会制造大规模重复；
- 进程中断后重试保持幂等。

## 4. 生命周期与降级

- discovered/draft 不进入生产调度；
- 缺 policy、manifest、fixture 或 contract 时不能进入 shadow；
- shadow 只做隔离验证，结果不自动进入发布链路；
- 未达到成功率、新鲜度、回源率门槛不能 active；
- 连续 transient failure 进入 degraded，schedule 自动放缓；
- schema drift、许可变化和安全异常进入 quarantined；
- half-open 仅执行 probe，成功达到门槛后恢复；
- 每次状态转换有 actor、reason、evidence 和时间审计；
- retired 软卸载不删除历史 provenance；
- fallback 不会自动把 aggregator 提升为 primary fact。

## 5. 上游适配专项

### AI HOT

- fingerprint-first 调用顺序；
- items 的 selected/all、take、cursor 参数正确；
- weak ETag/If-None-Match 和 304；
- 429 后按公开契约退避；
- 非浏览器、可识别 User-Agent；
- item 同时保存 aggregator permalink 与 original URL；
- AI HOT 只计 discovery/heat，不增加 primary evidence count；
- OpenAPI fixture 漂移时 shadow verification 失败并告警。

### HuggingNews

- 只提取公开 story metadata、source role、计数和原始链接；
- 不复制完整文章或 source text；
- HTML class/结构变化导致明确 drift，不静默返回健康空列表；
- 默认 disabled/shadow；正式 API/RSS 可用前不进入稳定 SLO；
- robots/政策变化可触发 quarantine。

### PriceAI

- 只导出明确归属的外链、风险说明和独立官方价格证据；
- 不批量复制生产价格、渠道、库存、freshness 或 crawl logs；
- fixture 和测试不得包含 PriceAI 生产数据快照；
- 官方价格来自厂商原始页面，保留 verifiedAt 和单位；
- PriceAI 外链失效不会被替换为非授权镜像。

## 6. Provenance、独立性与热点

- aggregator item 能回链 original source；
- 无 original source 时事件不能进入 published fact；
- 一个聚合站的多条记录只计一个 discovery domain；
- 同作者跨平台转发不会被计为多个独立作者；
- 同媒体集团矩阵转载触发 repost penalty；
- 两个不同 source 即使 tier/authority 相同仍保持独立；
- 引用同一原始公告的媒体不会被误当两个 primary evidence；
- 跨中文/英文 aliases 能聚到同一事件候选；
- velocity、persistence、region/language/platform breadth 使用真实窗口；
- 手工覆盖保留自动原分、原因、操作者和时间；
- 单平台/单作者高互动不能标记为跨圈热点。

## 7. Source Discovery 与覆盖

- backlink 可生成去重候选；
- 已有 source 不会重复创建 candidate；
- candidate score 因原创性、独立性和覆盖增量变化；
- 不合规/需绕过访问限制的候选被拒绝；
- coverage cube 正确按地区、tier、角色、主线、传播域、语言统计；
- “角色已收录”和“近 30 天有效观测”指标分离；
- media group 关系会影响独立性而不删除原始证据。

## 8. 管理台与发布闭环

### API

- source candidate CRUD、probe、promote、degrade、quarantine、restore、uninstall 均鉴权；
- 非法状态转换返回 409/validation error；
- source run/diagnostics 不向 public API 暴露内部错误和 config；
- signal merge/split、event review、track compose 有审计；
- view config 使用 typed schema，不接受任意未验证 JSON；
- snapshot preview/approve/publish/rollback 有权限和审计。

### 浏览器 smoke

- 来源健康、覆盖缺口、运行明细、错误类型可查看；
- 管理员能从 candidate 完成 shadow 与 active 晋级；
- degraded/quarantined 状态和恢复动作清晰；
- signal 可查看 provenance 和回源状态；
- 主线编排、view 配置会真实影响 preview；
- 发布后 Pages artifact 与 approved snapshot hash 一致；
- 回滚后公开站恢复前一 snapshot。

## 9. 星探精灵

### 领域与生成

- 每张卡至少绑定一个 reviewed event 和 evidence；
- venture/media/work/learning/artifact/influence 类型校验；
- why now、target audience、artifact、first experiment、risk、invalidators 必填；
- claim 区分 evidence 与 inference；
- 单一 aggregator 或低 confidence event 不生成高 evidence strength；
- 生成失败不阻塞 collect/cluster/publish；
- model、prompt version、input refs 和 output hash 可回放。

### 排名与去重

- 同一事件的近义机会被合并或抑制；
- 每事件/窗口数量上限生效；
- novelty、actionability、owner fit、timing、evidence strength 因子可解释；
- 主人禁区和偏好影响 owner fit，但不改变事实评分；
- 已驳回近义机会在冷却窗口内不重复冒泡。

### 隐私与交互

- Scout 默认 private，不进入 public snapshot；
- 收藏、暂缓、驳回和原因反馈持久化；
- snoozed card 到期前不冒泡；
- 外部动作必须二次确认；
- 静态导出不含 owner profile、feedback、prompt 或 model input。

## 10. 数据库与恢复

- SQLite migration/up/down、WAL 并发和备份恢复；
- MySQL service 中执行相同 migration/repository/lifecycle 测试；
- source run/nextState 事务在两种数据库语义一致；
- audit/snapshot append-only 约束有效；
- 数据库故障不会留下 active lease 或半发布 snapshot；
- snapshot rollback 不修改历史 evidence。

## 11. 性能基线

先测量再冻结 SLO，至少记录：

- 100/1,000 sources 调度开销；
- 每来源 100/10,000 items 的 normalize/dedupe；
- 10 万 signals 下未聚类查询与 provenance 查询；
- 静态导出 1,000/10,000 events 的耗时和输出体积；
- admin dashboard 聚合查询；
- Scout dedupe/rank 的批处理耗时。

## 12. 发布门禁

发布前必须同时满足：

1. lint、typecheck、unit、integration 全部通过；
2. source contract 和 drift fixtures 通过；
3. SQLite 必跑，MySQL 声明需对应 CI 通过；
4. SSRF redirect、body limit、retry/circuit breaker 安全测试通过；
5. privacy export scan 与关键浏览器 smoke 通过；
6. 上游许可/robots 审计时间未过期；
7. approved snapshot、artifact hash 和 rollback 演练有证据；
8. README/TASKS 的实现状态与测试证据一致。
