# TEST：数据恢复与持续进化

## 1. 基线门禁

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run export`
- `git diff --check`
- 静态输出隐私扫描
- admin/public 浏览器 smoke

真实网络结果与 fixture 测试必须分别报告。

## 2. Source Check

- 195 个来源都产生 check 或明确 policy/manual/restricted 结果；
- 单源 DNS、timeout、403、404、429、5xx、redirect、body limit、parse empty、schema drift 不阻塞批次；
- 检查记录包含访问、内容数、最新时间、格式、重复、质量、错误、修复、代理提示、保留建议；
- probe 不写 Signal、不推进 collector cursor、不直接 active；
- transient failure 不 retired；security/policy 问题可 quarantine；
- 相同来源多次检查保留历史。

## 3. Adapter Contract

### RSS

- RSS 2.0、Atom、namespace、CDATA、相对 URL；
- 304、异常空 feed、非 XML、错误日期、重复 entry；
- fixture 无完整第三方正文和敏感数据。

### GitHub releases

- repository URL 到 releases feed；
- organization/user/non-GitHub URL 拒绝；
- 无 release、pre-release、tag/release URL 去重；
- Atom 结构漂移产生诊断。

### JSON API

- array 和常见 wrapper；
- 明确 data path/field mapping；
- JSON content-type/schema mismatch；
- 无 URL/title/date 的 item 被拒绝或降质。

### HTML metadata

- JSON-LD Article/NewsArticle、canonical、published time；
- list page 与 article page区分；
- 只有导航链接不算 signal；
- JS shell/空页面明确 `dynamic_required`；
- 不执行来源脚本、不绕过限制。

## 4. 代理、重试和调度

- 代理环境只在显式开关下使用；日志和快照不出现代理 URL；
- NO_PROXY 匹配正确；
- 429 遵循 Retry-After，瞬时错误有限重试；
- per-domain token bucket 与 global concurrency 生效；
- 等待可取消；失败释放 token/lease；
- 同一来源不会被本地长跑和 CI 并发写入。

## 5. 质量与去重

- URL hash 幂等；tracking 参数不制造新 Signal；
- 标题 fingerprint 识别格式差异；
- 相同公告的媒体转载不增加 primary evidence；
- 历史 backfill 不因 freshness 被错误淘汰；
- 聚合源标记 discovery/heat；
- 质量分保存分项、样本数和数据质量。

## 6. 管线漏斗

- 每层输入、输出、失败和 retryable 数量一致；
- 没有 primary evidence 的 Event 不 ready；
- placeholder insight 不 ready；
- 冲突 claim 不自动公开；
- published Event 均有可点击证据；
- export 不包含 review Event。

## 7. 管理台

- health tab 可打开，无 JS console error；
- 展示目录覆盖和有效观测覆盖；
- 来源详情显示 checks/runs/quality/freshness/duplicate/error history；
- retry/shadow/degrade/quarantine/restore/retire 需要 token；
- action 结果刷新后可见；
- 375px 无关键操作丢失。

## 8. 长跑与恢复

- 可用短间隔 fake clock 测试多 iteration；
- 单轮异常不终止 supervisor；
- checkpoint 可恢复；
- SIGTERM 正常关闭；
- 迭代报告前后指标完整；
- 真实 5 小时运行记录每轮心跳和结果。

## 9. GitHub 闭环

- refresh workflow 真实成功；
- 快照只有 allowlist 字段；
- bot commit 只改公开快照/报告白名单；
- Pages 从新快照成功构建；
- 公共 JSON 与仓库 approved 数据一致；
- 无有效变化不产生提交。
