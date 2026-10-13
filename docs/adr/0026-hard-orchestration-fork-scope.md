# ADR-0026: Fork Scope — OpenCode Hard Orchestration

Date: 2026-10-13 23:13 KST
Status: Implemented

## Context

`agnusdei1207/opencode-orchestrator` 2.0.15 had grown mission state, task
tools, slash commands, a plugin options system, a Rust CLI and landing site,
plus knowledge/memory subsystems. That surface does not match the workflow
this fork wants: one forced Commander that only delegates and distills.
This decision records the strip, the rename, and what was deliberately kept.

## Decision

1. Rename the package to `opencode-hard-orchestration` (display
   "OpenCode Hard Orchestration"), version reset to `0.1.0`, repository
   `NiceLookinGuy/opencode-hard-orchestration`. The strip commit is
   `1c173e6`.
2. Keep the hard-orchestration core:
   - Commander as forced `default_agent` (`src/plugin-handlers/config-handler.ts`).
   - Delegate-only Commander prompt (`src/agents/prompts/commander-delegate.ts`).
   - Registration permission gate `{"*": "deny", "task": "allow", "question": "allow"}`,
     with precedence registration default < global `permission` < agent-specific.
   - Native subagent unblocking: `explore`/`general`/`scout` unhidden,
     `plan`/`build` demoted to subagents (v1 creates missing plan/build entries;
     v2 updates only host-created agents).
3. Keep both reliability guards and their rationale:
   - Oversized tool-result truncation came from upstream PR #53; it caps message
     parts over 200,000 chars before the model request (v1
     `experimental.chat.messages.transform`, v2 session `context` hook).
   - Thinking-tag cleanup addresses upstream issue #50; on v1 only, a finalized
     text part that is exactly `</assistant-thinking></think>` is blanked.
4. Retain the minimal `customRendering` boolean read in `src/index.ts` as a
   deliberate exception to "no options": the text-complete cleanup is skipped
   when it is `false`, so WebUI rendering does not regress (upstream issue #52).
   It is a single host-boundary switch, not a reintroduction of the removed
   options system.
5. Remove missions and the mission loop, task/background tools, slash commands,
   plugin tools, the options system (`agentConcurrency`, `missionLoop`, ...),
   the knowledge/memory/RAG subsystems, the Rust CLI, `/server`-split runtime
   modules, the landing site and its root mirrors, and the pre-fork docs set.
6. Distribution is git-only with `dist/` committed so git installs execute the
   built output; there is no npm publish, no Rust build, and no landing site.

## Consequences

- OpenCode 1 installs use
  `"opencode-hard-orchestration@git+https://github.com/NiceLookinGuy/opencode-hard-orchestration.git#main"`;
  OpenCode 2 installs use `opencode plugin add github:NiceLookinGuy/opencode-hard-orchestration`.
- v2 gaps (unchanged from ADR-0024/0025): no permission gate because
  `Agent.Info.permissions` has no equivalent shape, and no text-complete hook,
  so thinking-tag cleanup is v1-only. The v2 boundary registers only the agent
  transform and the context message guard.
- ADR-0021 is superseded. ADR-0022/0024/0025 are kept as history with fork
  annotations. ADRs 0001-0020 and 0023, the architecture/knowledge docs,
  histories, release/review notes, `CONTRIBUTING.md`, and `user-prompt/` were
  deleted; all remain recoverable in git history.
- Tests were pruned to the kept surface; `npm test` passes with 15 files /
  86 tests (`1c173e6`). `dist/` integrity tests pin the committed build.
- Rollback is a revert of the strip commit plus this document.
