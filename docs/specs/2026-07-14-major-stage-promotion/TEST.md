# TEST：重大事件驱动的趋势阶段晋级

## 1. 候选门禁

- 普通分数、review、过期、supporting-only、单来源、无 Tier 1、冷却期内或已处理 Event 均不调用模型。
- 同时存在多个合格 anchor 时，只选择确定性排序最高的一个。
- 不使用 aggregator Evidence；不同 URL 但同 source/hostname 不能伪装独立性。

## 2. V4 Pro 结构与 provenance

- 请求使用 `deepseek-v4-pro`、thinking enabled、high reasoning effort 和 JSON mode。
- `hold` 不产生 candidate 文件。
- `promote` 的未知 Track/Event/URL、缺 anchor、少于两独立来源、置信度不足、错误 start、重复 label、placeholder 或越界文本全部拒绝。
- 原始模型输出和 reasoning 不进入报告、文件与错误消息。

## 3. 持久化与导出

- apply 必须要求合法 GitHub Issue number/url。
- 同 promotion id 幂等，不重复写入。
- 新阶段开始时，前一开放阶段结束于前一天，新阶段保持开放；其他 Track 不变。
- 最新晋级更新 Track `now/next` 和 horizon；历史阶段正文不变。
- 损坏、重叠或倒序记录使导出失败。
- `narratives.json` 的实质变化会改变 public fingerprint。

## 4. Issue

- Markdown 包含 marker、趋势、事件详情、阶段影响、旧阶段不足、反向信号、下一验证、Evidence/Source 表与 Actions 链接。
- Markdown 转义标题和外部文字；URL 必须来自已校验 Evidence。
- 同 marker 更新/reopen，不创建重复 Issue。

## 5. Workflow 契约

- stage propose 位于 remote merge 后、export 前；
- Issue 成功后才 apply；
- commit 同时 add snapshot 与 stage promotion 文件；
- stage AI/Issue/apply 失败不阻断 snapshot/Pages；
- 损坏的持久化 JSON 和隐私扫描失败会阻断发布；
- artifact `if: always()` 且不含 candidate 原文/原始 completion。

## 6. 验证命令

```bash
npm run check
npm run build
git diff --check
```

补充解析全部 workflow YAML、检查组合 shell 语法、扫描 secret/本机路径，并用 fixture 执行 propose → Issue render → apply → export。

## 7. GitHub 验收

1. PR CI 成功并合入 main；
2. 手动运行 Data Refresh；
3. 无合格 anchor 时日志明确 `no_candidate`，不调用 V4 Pro、不创建 Issue；
4. fixture/dry-run 验收 V4 Pro contract，不用伪造公开阶段；
5. 后续真实 anchor 晋级时，必须同时看到专属 Issue、stage commit、Pages 成功和公开轨迹；
6. 任一步失败时，原增量 snapshot 仍能回流仓库。
