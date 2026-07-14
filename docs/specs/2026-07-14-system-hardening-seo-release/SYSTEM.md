# 系统设计

## 发布主路径

```text
Source adapters
  -> Signal / Observation
  -> cluster + evidence gates
  -> Event / Track / Scout
  -> versioned SQLite snapshot
  -> one batched public model
  -> static HTML + public JSON + sitemap
  -> public integrity validator
       |-- fail: no snapshot commit, no Pages deploy
       `-- pass: commit / upload / deploy
```

## 批量公开模型

Repository 一次读取 published Events，并用批量查询分别取得 evidence、track 和 actor 关联。内存按 `event_id` 分组后构造公开 DTO。单 Event 查询接口继续保留给管理与局部流程使用，静态导出不再调用它们。

```text
before: 1 + N evidence + N tracks + N actors
after:  1 events + 1 evidence + 1 tracks + 1 actors
```

## 公开完整性门禁

门禁只读取 `dist/`，不访问数据库和网络，保证 CI 与本地结果一致。报告至少包含：

- 公开 JSON schema、生成时间与条目数；
- 中文和英文主页面是否存在、是否有唯一 canonical / hreflang；
- Event 详情页数量是否等于 Timeline Event 数量；
- Timeline 中是否存在每个 Event 的真实 `href`；
- Signals、Scout、Actors、Sources 主页面是否消费对应数据；
- sitemap 是否覆盖全部可索引页面且不包含 404 / admin；
- HTML / JSON 是否残留模板占位、本机路径、冲突标记或敏感字段名。

报告写到 stdout，可由 Actions 保存为 artifact。任何硬错误退出非零。

## SEO / GEO 结构

```text
Home
  -> WebSite + Organization
  -> crawlable links to trends and events

Trend page
  -> WebPage + visible evidence links

Timeline
  -> CollectionPage semantics
  -> anchor[href] per Event
  -> JS intercept for drawer only on unmodified click

Event page
  -> Article + BreadcrumbList
  -> fact / impact / audience / next watch
  -> original evidence citations

Sources
  -> Dataset landing page
  -> public JSON distribution
  -> explicit lifecycle and health boundaries
```

JSON-LD 使用脚本上下文安全序列化：保留合法 JSON，只转义 `<`、`>`、`&` 与 Unicode 行分隔符，阻止 `</script>` 提前结束标签。页面正文仍使用 HTML 文本转义。

## Actions 失败策略

- CI：export 后验证，不通过则 PR / main check 失败。
- Data Refresh：最终 export 后、snapshot write 与 commit 前验证；AI 失败仍可降级，但内容一致性失败不可降级。
- Source Audit：最终 export 后、report / snapshot commit 前验证。
- Pages：上传 artifact 前验证；不完整构建不得部署。
- Release：仍只在 main CI 成功且版本契约通过后创建 GitHub Release。

远端快照 merge 后必须再次执行来源对账，再进行最终 export 与 snapshot write。这样 merge 保留的历史检查可以驱动 `quarantined -> shadow` 的确定性恢复，旧快照中的生命周期不会覆盖本轮已满足恢复门槛的状态。

## 回滚

- 代码与规格通过单一版本提交回滚。
- 快照继续使用仓库 merge 语义，不以 `.gitignore` 或覆盖远端快照解决冲突。
- 来源生命周期恢复在远端快照 merge 后重算，不依赖 merge 前的临时数据库状态。
- 完整性门禁本身不修改数据；误判时可以先修正规则并重新运行，不允许绕过后发布。
