# ADR-0025: Hard Orchestrator Defaults on Install

Date: 2026-10-13 21:21 KST
Status: Accepted

## Context

Since ADR-0021, the plugin registered Commander, Planner, Worker, and Reviewer as
presets but left default-agent selection, native `plan`/`build` modes, and
Commander's tool surface to ambient OpenCode configuration. Installing the
orchestrator therefore did not reliably produce an orchestrating session: the
user could land on a native agent, and a selected Commander still held the full
native tool surface instead of delegating.

The user approved a hard-orchestrator installation profile: Commander delegates
only, and OpenCode's native delegated-agent types are usable from the bundled
Commander prompt. This is a deliberate partial reversal of ADR-0021's removal of
automatic default-agent takeover and build/plan demotion.

## Decision

1. Commander receives a registration-default permission gate
   `{"*": "deny", "task": "allow", "question": "allow"}`. Precedence is
   registration defaults < global `permission` < same-name agent permission, so
   every user override still wins. Non-Commander agents keep copying the global
   permission block exactly as before.
2. The Commander system prompt is the delegate-only text supplied by the user
   (`commander-only-delegate.md`), embedded verbatim as
   `src/agents/prompts/commander-delegate.ts` except that the `plan` and `build`
   table rows now say `subagent`. The composed core-philosophy, working
   discipline, and mission-contract fragments are no longer included in the
   Commander prompt; they remain for Planner, Worker, and Reviewer.
   **[Planner, Worker, and Reviewer were removed in the fork; only Commander
   remains (ADR-0026).]**
3. `default_agent` is forced to `Commander` on every install (the v1.6.3
   behavior), overriding any user `default_agent`.
4. The native OpenCode agent types `explore`, `general`, `scout`, `plan`, and
   `build` are unblocked when present: `hidden: true` and `disable: true` are
   stripped, and `plan`/`build` are forced to `mode: "all"` (entries are
   created when absent in OpenCode 1 config). `"all"` keeps them selectable in
   the TUI agent switcher and delegatable by Commander; the switcher filters
   out `"subagent"` and the delegation catalog filters out `"primary"`.
   Planner, Worker, and Reviewer stay hidden presets, and capitalized names
   such as `Plan` are untouched.
   **[Originally `mode: "subagent"`; revised to `"all"` so plan/build stay in
   the TUI agent switcher. Both host schemas accept `"all"`; see ADR-0027.]**
   **[Planner, Worker, and Reviewer were removed in the fork (ADR-0026).]**
5. Agent descriptions are unchanged. Only the lowercase native names are
   normalized.

## Consequences

Fork update (ADR-0026): the guard hooks established here were kept — oversized
tool-result truncation (OpenCode 1 messages-transform hook and OpenCode 2
context hook) and the OpenCode 1 thinking-tag cleanup (PR #53 and issue #50
rationale). Everything else the fork did not need was removed, including the
mission system-transform handler, so the prompt-injection limitation recorded
below no longer exists.

OpenCode 1's config hook performs all five changes. OpenCode 2's agent transform
can only update agents the host already created (ADR-0024): absent native types
are skipped, no permission gate is applied there because the v2
`Agent.Info.permissions` shape is an action/resource/effect array with no
verified equivalent for this gate, and `default_agent` is set through
`editor.default`.
**[Superseded by ADR-0027: on OpenCode 2.0.32 the transform upserts missing
agents, `Agent.Info.permissions` carries a real ruleset, and the gate plus
scout are implemented there.]**

Known deviations and limitations:

- The dropped Commander prompt no longer carries the
  `[Compressed conversation section]` guidance recorded in ADR-0021-era tests.
  The user's live prompt never had it; the mission loop and subagent prompts are
  unchanged.
- `default_agent` must name a non-hidden agent. If a user explicitly configures
  `agent.Commander.hidden`, the host owns the resulting selection behavior.
- The mission system-transform handler can still inject task-tool and
  background-task text during an active mission (`buildMissionLoopSystemPrompt`,
  `buildBackgroundTasksPrompt`), which contradicts the delegate-only prompt.
  This is pre-existing and tracked as follow-up work.
  **[Resolved by ADR-0026: the mission system-transform handler was removed.]**
- Unhiding native types is skipped on OpenCode 2 when the host does not expose
  them; the v1 path creates only `plan`/`build` entries, never `explore`,
  `general`, or `scout`.

Rollback is a revert of the implementing commit; the previous prompt fragments
still exist and the snapshot test pins the delegate-only prompt.
