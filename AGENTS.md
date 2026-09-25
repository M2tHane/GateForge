# GateForge Development Instructions

GateForge 按 `docs/stages/` 分阶段开发。

开始任务前先确认当前 Stage，并阅读：

- `README.md`
- `docs/DEVELOPMENT_GUARDRAILS.md`
- 当前 `docs/stages/<stage>.md`
- 与当前任务直接相关的设计文档

不要为了当前任务无条件通读全部文档。

## 工作方式

按小批量推进：

```text
Read → Plan → Implement → Verify → Update Stage Doc → Commit
```

只实现当前 Stage 和当前任务范围内的内容，不主动跨 Stage，也不要顺手做无关重构。

如果实现与已冻结文档冲突，先指出冲突，不要自行修改核心架构来迁就代码。

## Stage 进度

`docs/stages/<stage>.md` 同时作为阶段进度记录。

如果没有进度区，可在文档末尾增加：

```md
## Implementation Progress

### Completed
- [x] ...

### In Progress
- [ ] ...

### Pending
- [ ] ...
```

任务只有在实现完成当前任务范围内验证通过之后才能标记为完成。

每完成一个实际任务或任务组，就同步更新 Stage 文档，不要等整个 Stage 完成后再统一补进度。

不要为了记录开发进度修改 PRD、ARCHITECTURE 等冻结设计文档。

## 测试

默认只执行与本次修改直接相关的测试。

例如修改某个 Domain，只运行该 Domain 的：

- compile / typecheck
- unit tests
- 必要的 integration tests

不要默认执行：

- 全仓库测试
- 全量 E2E
- 所有模块 build

只有以下情况才进行较大范围验证：

- 用户明确要求
- 当前 Stage Gate 要求
- 修改 shared contracts / 公共基础设施
- 无法可靠判断影响范围
- 当前 Stage 即将完成

测试失败时，优先判断是否由当前修改引起。不要因为发现无关旧问题而扩大任务范围。

## Commit

不要等整个 Stage 完成才提交。

完成一个稳定工作单元后：

1. 运行当前范围内测试
2. 更新 Stage Progress
3. 检查 `git diff`
4. 创建 commit

一般每完成 1–5 个高度相关的小任务，或一个完整功能切片，就提交一次。

代码和对应的 Stage Progress 更新放在同一个 commit。

Commit message 使用清晰语义，例如：

```text
feat: implement conversation workspace
feat(control-plane): add workspace domain
fix(runtime): preserve task agent version
test: cover skill clone behavior
```

避免 `update`、`changes`、`fix stuff` 这类无意义提交信息。

## 恢复工作

恢复开发时优先查看：

```bash
git status
git log --oneline -10
```

以及当前：

```text
docs/stages/<stage>.md
```

以仓库状态和 Stage Progress 为事实源，不依赖历史聊天记录判断进度。

## 默认原则

遇到不明确的情况时，优先选择：

- 更小的修改范围
- 更少的架构变化
- 足够但不过度的测试
- 更清晰的小批量 commit

目标是持续留下可验证、可回退、可继续开发的稳定状态。