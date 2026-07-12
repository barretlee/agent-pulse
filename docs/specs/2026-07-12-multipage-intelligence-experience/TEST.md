# 测试与验收矩阵

## 自动化

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run export`
- `npm run build`
- `git diff --check`

## 静态多页

- 所有目标路由生成 `index.html`，title/description/canonical 唯一且非空。
- 相对路径在根页面、一级页面、二级主线/事件页面均可加载。
- 首页只加载 Today 所需数据；工具页按页加载对应 JSON。
- 44 个公开事件均有稳定详情页；无 Track 事件明确显示“待编排”，不伪造主线。
- 404 页面包含返回首页、主线和时间轴入口，不复制整张首页。

## 内容密度与交互

- 1440×900：Today 事实、证据状态、两个判断维度与 CTA 在首屏。
- 390×844：无横向溢出，固定导航不遮挡内容，触控区 ≥44px。
- 时间轴搜索、筛选、URL 状态、详情预览和返回行为正确。
- 主题切换在各页一致；`prefers-reduced-motion` 禁用非必要动画。
- 页面无控制台错误、资源 404 或不可达内部链接。

## Issues 来源治理

- 缺字段、超长文本、反引号、命令替换、`${{ }}` 只作为文本处理。
- 拒绝 credentials URL、HTTP、localhost、私网、link-local、IP literal 和异常端口。
- slug、endpoint、homepage、identity host 与 root domain 多维去重。
- Issue 不能设置 enabled/active/authority/adapter。
- 只有维护者 `source:import-ready` 才能生成 PR；重复运行幂等。
- proposal 合并后仍是 disabled draft；不能被 collect 或公开 Timeline 消费。

## Actions 连续性

- audit 先恢复 snapshot，再写回 source checks；fresh runner 可累积历史检查。
- audit 与 refresh 共用 writer lock。
- snapshot/report 隐私扫描通过，Pages 仅在公开数据变化时触发。
- 单源失败不阻塞批次；三次失败/恢复的 health issue 更新幂等。

## 版权

- snapshot 中 Signal/Discovery summary ≤320 字符。
- 不包含 source `sample_json`、raw payload、本机路径、凭证或代理 endpoint。
- `/legal/`、correction/takedown issue form、第三方图标 notice 存在。
- README 清楚说明 MIT 不覆盖第三方内容。

## GitHub 发布

- 默认英文 README 与中文入口有效。
- Stars 由构建阶段 DTO 提供；无数字或过期时具有合理 fallback。
- PR CI、main CI、Pages 全部成功；线上逐页浏览器 smoke 通过。

