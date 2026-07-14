# 系统设计

## 告警决策链

```text
monitor:check
  -> monitor.json（事实与确定性 severity）
  -> hard-failure gate
       -> site down / monitor crash / snapshot > 72h: alert
       -> contextual critical: cooldown gate
            -> same/open incident < 7d: suppress
            -> eligible: AI structured review
                 -> schema + confidence >= 0.75: alert / suppress
                 -> invalid / unavailable: suppress contextual alert
  -> monitor-decision.json（始终上传）
       -> notify=true: create/update single incident
       -> notify=false: Job Summary only
```

## 决策边界

- `monitor.json` 是事实源；AI 只能判断“是否值得现在通知”，不能改变 check 状态。
- 硬故障由代码识别并优先于 AI，模型无权压制。
- AI 输入仅包含公开或运行态聚合指标、当前 issue 的更新时间和稳定指纹，不包含 Secret、原始 payload 或 Issue 正文。
- 模型必须返回严格 JSON：`decision`、`confidence`、`reasonCode`、`rationale`、`suggestedAction`。
- 模型建议 alert 但置信度低于 `0.75` 时，本地降级为 suppress。
- Issue body 写入 v2 marker 和指纹；同类事件在七天内不重复改写。

## 人工触发

- `workflow_dispatch.allow_notification=false`（默认）：执行完整检查和 AI 复核，但 `notify` 强制为 false。
- `allow_notification=true`：允许决策链在满足门禁后更新 Issue，不等于强制报警。

## 回滚

- 删除 AI 决策步骤并恢复 `steps.monitor.outputs.status == 'critical'` 即可回到旧逻辑。
- DeepSeek Secret 缺失不会阻塞监控；硬故障仍告警，上下文型 critical 留在 artifact 和 Summary。
