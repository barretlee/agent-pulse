# 测试方案

## 1. 自动发布

- 高分且绑定已公开 Event 的 Scout 直接 published，并写入 `published_at`；低分自动 archived。
- 旧 inbox 经自动推进后不再停留在待人工状态。
- ready Event 自动 published；blocked Event 状态保持 review。
- 后台 HTML/JS 不包含“细看、接受、忽略、编辑 / 发布、确认继续”等人工确认文案。

## 2. Actions 与 Release

- Data Refresh cron 为每 4 小时，包含 Scout、自动发布、评测、快照和 Pages。
- Quality Guard cron、60 分阈值、刷新冷却和 workflow dispatch 均可静态验证。
- Release notes 能精确抽取指定版本；缺少仓库或网站版本时失败；已有 tag 时 no-op。
- GitHub workflow 权限最小化，数据写 workflow 继续共享 concurrency。

## 3. 时间与论文

- 最近 7 天事件带高亮，超过 7 天不带；未来时间不会被误标。
- 最近三个完整月每月公开 Event 不少于 6。
- 最近三天论文批次状态能区分有内容、周末空档与等待下一批。
- 论文日报继续只在同日达到阈值时聚合，独立 Event 和证据不丢失。

## 4. KOL

- KOL slug 唯一、profile URL 合法、自动 feed 与 restricted profile 明确分离。
- 宝玉、李沐、Lilian Weng、Eugene Yan 等公开 RSS/Atom 通过 collector fixture 或真实 endpoint 合约。
- Sources 页面显示国内/海外、自动 feed 数和平台 restricted 状态。

## 5. 回归

- `npm run check`、`npm run build`；
- 静态隐私扫描与内链检查；
- GitHub Actions 真实运行；
- GitHub Release 与 Pages 线上验证。

