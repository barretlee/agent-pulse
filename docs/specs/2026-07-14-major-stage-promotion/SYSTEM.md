# SYSTEM：重大事件驱动的趋势阶段晋级

## 1. 执行架构

```text
published Events + EventTrack + Evidence + Source metadata
  -> deterministic anchor gate
       recent <= 14d
       confidence >= 92
       impact >= 98
       value >= 85
       milestone role on target Track
       >= 2 independent sources/hosts
       >= 1 Tier 1 primary/research/policy
       current stage age >= 45d
       event/stage not already promoted
  -> choose one highest-confidence anchor globally
  -> DeepSeek V4 Pro structured verdict
       hold     -> report only
       promote  -> local validation
  -> schema/provenance/novelty/boundary gate
  -> render + upsert dedicated GitHub Issue
  -> apply validated record with issue backlink
  -> merge dynamic stages during export
  -> fingerprint -> snapshot/stage commit -> Pages
```

模型只在确定性 anchor 存在时调用。一次运行最多选择一个 anchor、调用一次模型、应用一个新阶段。

## 2. 晋级记录

`data/narratives/stage-promotions.json`：

```text
schemaVersion: 1
promotions[]
  id / marker
  trackSlug
  anchorEventSlug
  sourceEventSlugs[]
  usedEvidence[] { title, sourceSlug, sourceName, url, publishedAt }
  stage { start, end=9999-12-31, period, label, summary,
          interpretation, chinaPosition, nextSignal }
  trackNow / trackNext
  impactStatement
  previousStageGap
  counterSignals[]
  confidence
  model=deepseek-v4-pro
  inputHash
  issueNumber / issueUrl
  createdAt
```

只保存通过本地门禁且已准备公开的文本；不保存 prompt、reasoning、原始 completion、token、cookie、私有路径或 DB 字段。

## 3. 动态合并

导出时读取静态叙事和晋级记录，按 `trackSlug + stage.start` 排序：

1. 验证记录唯一、Issue 回链有效、起始日期递增；
2. 将当前开放阶段 `end` 改为新阶段开始前一天；
3. 追加新阶段，`end=9999-12-31`；
4. 最新晋级覆盖 Track 的 `now` 与 `next`；
5. `horizon.end` 至少推进到最新晋级日期；
6. 原 Event/Evidence 不复制，既有双时间轴继续负责阶段证据归组。

历史阶段正文不由运行时改写。回滚只需 revert 晋级记录；导出会恢复前一开放阶段。

## 4. V4 Pro 契约

请求级配置：

```text
model: deepseek-v4-pro
thinking.type: enabled
reasoning_effort: high
response_format: json_object
temperature: 0
```

输出必须明确 `decision=hold|promote`。`promote` 需要给出完整阶段字段、当前判断、下一判断、影响、旧阶段不足、反向信号、Event slugs、Evidence URLs 和 0—100 置信度。

本地再次校验：

- `confidence >= 95`；
- `trackSlug`、Event slug 和 Evidence URL 都是输入 allowlist 子集；
- anchor Event 必须被引用；
- 至少两个不同 source slug/name/hostname；
- 新阶段 `start` 必须等于 anchor Event 的 UTC 日期；
- label 与既有阶段、既有晋级不重复；
- 文本无 placeholder、无未知事实、无越界长度；
- 45 天冷却仍成立。

## 5. GitHub Issue

Marker：`agent-pulse-stage-promotion:<promotion-id>`；标签：`stage:milestone`。

同一 marker 只允许一个 Issue；重试时更新并 reopen。Issue 成功返回 number/url 后才应用晋级记录。Issue Markdown 由程序确定性渲染，外部文字转义，Evidence 使用 allowlist URL。

## 6. Workflow 顺序与失败语义

```text
... auto-publish -> evaluate -> fetch origin/main
  -> merge remote snapshot + restore latest stage-promotions.json
  -> stage propose (advisory AI)
  -> issue + apply (only valid candidate)
  -> export/fingerprint
  -> snapshot write/privacy validate
  -> commit snapshot + stage-promotions.json
  -> Pages
  -> weekly
  -> always upload safe reports
```

- propose/Issue/apply 失败：warning，阶段不落地，确定性数据继续回流；
- 晋级文件自身无法解析或合并：主链失败，禁止发布损坏叙事；
- commit/push 失败：主链失败；Issue 可能保留同 marker，下一次运行幂等修复；
- 不上传 raw completion；artifact 只含 status、model、inputHash、usage、安全错误码和 promotion id。

## 7. 安全与隐私

- V4 Pro 只读取公开 published Event DTO、公开 Evidence 与允许的 Source 元数据。
- 聚合来源、review Event、raw payload、管理备注不进入 prompt。
- Secret 只注入 stage propose step；Issue/apply/export 不需要模型密钥。
- 阶段文件纳入 `git diff --check`、JSON parse、URL allowlist 和私密材料扫描。
- `public:fingerprint` 纳入 `narratives.json`，阶段变化必然触发 Pages。
