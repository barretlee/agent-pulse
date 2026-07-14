# RESEARCH：阶段晋级当前事实与模型能力

## 1. 当前代码事实

- `industryNarratives` 位于 `src/catalog/history.ts`，六条趋势的阶段是静态 TypeScript 数据。
- `NarrativeStage` 只有时间边界、摘要、解释、中国实践和下一信号；公开 Event 仍由数据库提供。
- 静态导出按 Event 起点和 Evidence 发布时间把事实归入既有阶段；最后阶段使用 `9999-12-31` 开放终点。
- 当前 `public:fingerprint` 未包含 `narratives.json`，因此只改阶段叙事不会可靠触发 Pages。
- Data Refresh 已具备串行写锁、远端 snapshot merge、隐私校验、bot commit、Pages 派发、AI 失败隔离和 Issue 幂等模式。
- DeepSeek JSON 客户端当前固定 non-thinking；阶段判断需要为单次请求开放 thinking/high effort，不能改变 Event enrichment 和 weekly 的默认行为。

## 2. DeepSeek 官方能力核验

- 官方模型列表包含 `deepseek-v4-pro`，可直接用于 Chat Completions：<https://api-docs.deepseek.com/api/list-models>
- 官方快速开始示例使用 `thinking: { type: "enabled" }` 与 `reasoning_effort: "high"` 调用 V4 Pro：<https://api-docs.deepseek.com/>
- V4 Pro 支持 JSON Output：<https://api-docs.deepseek.com/quick_start/pricing/>

因此阶段判断使用独立模型配置 `deepseek-v4-pro`，请求级启用 thinking/high effort，并继续用本地 Zod 与 provenance 门禁校验最终 JSON。模型 reasoning 内容不进入仓库、日志或 artifact。

## 3. 方案选择

### 采用：受版本控制的晋级记录 + 导出时合并

```text
data/narratives/stage-promotions.json
  -> validate
  -> merge with static industryNarratives
  -> clamp previous open stage end
  -> append new open stage
  -> export narratives.json + pages
```

优点：不让运行时修改 TypeScript；可审计、可回滚、可由 git review；不新增数据库迁移；Pages 构建可从仓库状态完整复现。

### 拒绝：模型直接编辑 `src/catalog/history.ts`

运行时改代码会放大 prompt injection、格式错误和合并冲突，且难以区分内容晋级与代码发布。

### 拒绝：每个高分 Event 自动新建阶段

Event 分数用于候选发现，不足以证明旧阶段失效；这会把阶段变成新闻分类。

### 拒绝：只创建 Issue、不进入趋势轨迹

无法满足用户在阶段轨迹中消费新判断的目标，也不能形成站点与仓库闭环。

## 4. 已知边界

当前 Source 表没有 media-group 字段。第一版独立性门禁使用不同 source slug、不同 source name 和不同 URL hostname，并要求至少一个 Tier 1 primary/research/policy 来源；未来补齐组织/媒体矩阵身份后再升级为 group-level independence，未补齐前不宣称已完成媒体集团去重。
