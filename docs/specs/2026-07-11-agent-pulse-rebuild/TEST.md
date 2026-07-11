# 测试与验收

## 单元测试

- URL canonicalization：tracking、fragment、大小写 host、尾斜杠。
- source score：层级、可信度、启停和 aggregator 角色。
- event clustering：同事件合并、不同事件分离、时间窗口边界。
- heat score：独立作者、平台宽度、地区宽度、速度、转载惩罚。
- confidence/impact/value：边界值、缺失指标和管理员覆盖。
- exporter：只导出 allowlist 字段且不出现内部备注/token/path。

## 集成测试

- SQLite migration + seed + repository CRUD。
- collector 单来源失败隔离、超时和去重。
- admin token 鉴权、输入校验、状态变更。
- public API 只返回 published 事件。
- export 后 timeline JSON 符合 schema。

## 兼容验证

- SQLite 是 CI 必跑。
- MySQL repository/migration 在可选 CI service 中运行；没有 MySQL 时至少完成 dialect construction 和 SQL path 单测。

## UI 验收

- 桌面端点击卡片打开右侧详情，Esc/遮罩可关闭，hash 可深链。
- 三主题切换并持久化。
- 搜索和过滤组合正确，空状态可见。
- 375px 宽度下详情可完整阅读，无水平溢出。
- 管理台可启停来源、编辑事件、发布/隐藏和触发导出。

## 安全验证

- production 无 `ADMIN_TOKEN` 时写接口不可用。
- 私网 URL 被 fetch guard 拒绝。
- 恶意标题/摘要不会作为 HTML 执行。
- `dist/` 不含 `.env`、SQLite、绝对用户目录、token 字段。

## 命令

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run db:migrate
npm run db:seed
npm run export
npm run check
```

