# 系统设计

## 1. Brownfield 事实

- `web/public/index.html + assets/app.js + assets/app.css` 承载全部公开体验。
- `export.ts` 复制整个 `web/public` 并导出数据 JSON，适合继续采用静态多页。
- 首屏并行加载 timeline、tracks、actors、resources、scout、product、narratives 七份数据。
- 公开 Event 为 44 个，其中 36 个有一手证据，8 个没有 Track。
- `product.json` 已包含完整 releases、roadmap、capabilities 和 evaluation，但前端只显示极小切片。
- GitHub 仓库当前 2 Stars；最近 CI、refresh、Pages 成功；source-audit 尚未形成跨快照累积。
- snapshot 的 Signal summary 上限过长，公开仓库存在第三方内容复制风险。

## 2. 前端方案

不引入 React SPA。采用静态多页 + ES Modules：

```text
web/public/
├── index.html
├── lines/index.html
├── timeline/index.html
├── scout/index.html
├── actors/index.html
├── resources/index.html
├── product/index.html
├── changelog/index.html
├── sources/index.html
├── legal/index.html
└── assets/
    ├── app.css
    ├── core.js
    ├── pages.js
    └── icons.svg
```

动态生成的主线详情和事件页由 exporter 写入 `dist/lines/{slug}/index.html` 与 `dist/events/{slug}/index.html`，保证 title、canonical 和首屏正文不依赖 JavaScript 修改。

共享设计 token 从现有 Midnight / Paper / Signal 主题提取；动画仅使用短距离 reveal、active indicator、版本节点点亮和证据线进度，并支持 `prefers-reduced-motion`。

图标采用固定版本、本地 vendoring 的 Lucide SVG 子集；保留 ISC/MIT notice，不使用远程 iconfont。

## 3. 静态导出边界

`export.ts` 继续只负责编排，新增静态页面模块：

```text
src/pipeline/static-site/
├── dto.ts
├── seo.ts
├── render.ts
├── pages.ts
└── github.ts
```

公开数据新增 `data/github.json`：

```ts
{
  repositoryUrl: string;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  latestRelease: string;
  fetchedAt: string | null;
}
```

Actions 构建前通过 GitHub API 写入环境变量；本地或数据过期时只显示 `Star on GitHub`。

## 4. Issues 来源信任链

```text
source-proposal issue
  -> parse as text, never interpolate into shell
  -> Zod schema + HTTPS/credentials/IP/private/duplicate validation
  -> maintainer source:import-ready label
  -> normalize into versioned source-proposals.json
  -> generated PR
  -> CI + human review
  -> disabled draft catalog
  -> contract/fixture/policy verification
  -> shadow
  -> E3 observation
  -> 20 healthy checks + 7 days
  -> explicit human E4 activation
```

Issue 作者不能设置 adapter、authority、enabled、lifecycle 或 score。Workflow 不访问未批准 URL，不使用 `pull_request_target`，不将 issue body 插入 shell。

## 5. Actions 数据连续性

`data-refresh` 与 `source-audit` 共用：

```yaml
concurrency:
  group: agent-pulse-repository-data-main
  cancel-in-progress: false
```

审计运行：

```text
checkout main
  -> restore snapshot
  -> audit all catalog sources into same DB
  -> reconcile eligible E3 observation
  -> write snapshot + compact report
  -> privacy/check validation
  -> commit only material changes
  -> dispatch Pages
```

source checks 必须进入 snapshot，才能积累 20 次/7 天证据。单次失败只记录；健康 Issue 使用 slug 隐藏 marker 幂等更新，避免 Issue 风暴。

## 6. 版权和内容边界

- MIT 只覆盖代码与明确标记的项目自有文档。
- 第三方标题、商标、论文、新闻、博客、Release 与图片权利归各自权利人。
- snapshot Signal/Discovery 只保留 metadata 与最多 320 字符的必要短摘录；不保存完整正文。
- Event 的分析字段必须是 Agent Pulse 原创收敛并回链 canonical source。
- `sample_json`、raw payload、cookie、token、代理地址和私有备注不进入 Git/Pages。
- 公开 `/legal/` 提供来源归属、纠错、署名、下架与免责声明；Issue Form 提供 correction/takedown 通道。

## 7. 回滚

- 多页静态站可回滚到 v0.5.1 tag，数据 schema 不改变。
- Issues proposal 只进入 disabled draft PR，回滚为关闭 PR/Issue，不影响生产来源。
- audit workflow 若出现写入异常，可关闭新 workflow 并继续使用 data-refresh；snapshot 保持向后兼容。
- 摘录缩短是单向公开收敛，不恢复长正文。

