# 信源 100+ 扩张验收记录

## 口径

“目录已收录”“单次可抓取”“持续有效”和“已激活”是四个不同状态，不混用：

- 目录源：存在经过分类、合规边界和 adapter 配置的 catalog entry；
- operational healthy：本轮真实访问和抓取成功，至少返回一条带有效 URL、标题和非推断时间的数据，schema 正常，重复率不超过 80%，批次质量分不低于 35；
- effective：在 operational healthy 基础上，至少有一条有效内容，批次质量分不低于 60；
- active：另外通过至少 20 次 healthy 检查、至少 7 天观察窗口和人工确认。

时间新鲜度单独呈现，不用新鲜度覆盖来源本身的长期有效性。历史更新较少的项目可以是 effective，但不适合进入高频实时采集队列。

## 2026-07-12 实测结果

```text
Catalog entries                         258
Live rows                               259  (含 1 个保留 provenance 的 retired legacy)

Full audit
  healthy                               131
  degraded                               29
  failed                                 53
  manual / policy skipped                46
  accessible                            251
  fetched                               230
  with valid content                    140

Effective
  healthy + content + quality >= 60     120
  healthy, latest item <= 90 days       114
  上述两项交集                          104
```

报告：`data/reports/source-health-100.json`。

## 本轮新增池

新增 63 个第一方 GitHub Release Atom 源，全部经过真实 endpoint 探测和全量 source audit，63/63 为 healthy：

- 第一批全球 30 个、中国 16 个；第二批再补 14 个全球源和 3 个中国源；
- Agent / SDK / protocol 26 个；
- 模型、训练、推理与多模态开源栈 26 个；
- GPU、分布式和编译器基础设施 8 个；
- 评测与可观测性 3 个。

覆盖 OpenAI Codex / SDK、Anthropic SDK、Google Gen AI SDK、AutoGen、Semantic Kernel、LangGraph、MCP、LiteLLM、Promptfoo、Langfuse、Phoenix、Hugging Face 训练与推理栈、NVIDIA NeMo / NCCL / TensorRT / CUTLASS、ONNX Runtime、Triton、Ray、TVM、Kubeflow、向量数据库，以及 Qwen-Agent、LMDeploy、XTuner、MS-SWIFT、PaddleNLP、PaddleOCR、MNN、NCNN、MinerU、VeRL、DeerFlow、LightRAG、OpenManus、InternVL、CosyVoice、DeepSeek、MiniCPM-V 和 Yi。

同时修正三个既有配置：

- Xiaomi MiMo 从组织主页切到存在真实 release entry 的 `MiMo-Code` 仓库，复测为 healthy；
- Robbyant 和 Meituan LongCat 的组织 / 项目没有稳定 release entry，退回 manual，而不是把 GitHub 主页可访问误报为成功；
- 一次 arXiv AI 空结果被保留为 degraded，视为临时异常，不以新来源掩盖。

## 激活决策

本轮不执行批量 activate。全量审计完成后，使用 `observe:sources --confirm` 将 99 个同时满足 healthy、有内容、质量不低于 60、最新内容不超过 90 天且处于 shadow 的来源纳入 E3 隔离观察；加上 5 个既有 canary，实际可采集集合为 104 个。

E3 只允许 Signal 进入观察与可逆分诊池，不能生成或补强公开 Event。新增来源只有单轮真实检查，仍需按每日三轮 source audit 累积 20 次 healthy 和 7 天跨度，再对满足条件的候选逐批人工确认进入 E4；低频、长时间无 release 的来源即使 adapter 有效，也应保持 shadow 或低频 cadence。

## 下一阶段

1. 将 120 个 effective 源稳定在连续 7 天窗口，任何单次失败不得直接卸载；
2. 维持“90 天内更新且质量不低于 60”的 104 个严格实时有效源，并优先补中国厂商官方公告、资本机构原始文章和中美欧政策机构稳定 feed，降低工程 release 流的占比；
3. 为同一厂商的多个仓库维护 owner / media-group 身份，避免它们在多源交叉验证中被误算为独立证据；
4. 对 release notes 增加 breaking-change、capability、pricing、security 和 deprecation 事件分类，避免把每个补丁版本都升级为行业事件。
