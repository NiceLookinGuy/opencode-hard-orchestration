# Agent Memory - OCO Session

Last updated: 2026-10-13 KST

## Current task

Hard orchestrator defaults (user-approved): Commander permission gate, embedded
delegate-only Commander prompt, unconditional `default_agent = "Commander"`,
and native subagent unblocking (explore/general/scout/plan/build). Recorded as
ADR-0025 (partial reversal of ADR-0021). TS-only; no version bump; no Rust.
Implemented and committed locally as 373486f (NOT pushed). No repo work remains.

## Last completed step

- Baseline before edits: npm ci, build, 127 test files / 1,145 tests passed.
- `src/plugin-handlers/config-handler.ts`: exported `COMMANDER_DEFAULT_PERMISSION`
  (`{"*":"deny","task":"allow","question":"allow"}`), `NATIVE_SUBAGENT_TYPES`,
  `NATIVE_DEMOTED_TYPES`; `defineAgent` now merges defaults < global < agent
  permission; `unblockNativeSubagentTypes` strips `hidden:true`/`disable:true`
  and forces plan/build `mode:"subagent"` (creates `{mode:"subagent"}` entries);
  handler forces `default_agent`.
- New `src/agents/prompts/commander-delegate.ts`: byte-verified copy of
  `/Users/matth/.config/opencode/instructions/commander-only-delegate.md` with
  only the plan/build Mode cells changed to `subagent` (4,388 chars, verified
  programmatically against the source).
- `src/agents/commander.ts`: prompt is now `COMMANDER_DELEGATE_PROMPT`;
  `CORE_PHILOSOPHY` stays in `prompts/shared/philosophy.ts` for manager.ts:93.
- `src/v2/agent-adapter.ts` imports the shared native-type constants; unhides
  present native agents, demotes plan/build, calls `editor.default("Commander")`;
  absent types are skipped (v2 cannot create agents, ADR-0024). No v2 permission
  gate: `Agent.Info.permissions` is action/resource/effect with no equivalent.
- Tests updated: config-handler (forced default, gate precedence, native
  unblocking, capitalized names untouched), prompt-consistency (Commander
  delegate-only; M/T/S scope now Planner/Reviewer; mission continuity scoped to
  subagents), agent-definition (delegate-only assertions; .opencode scoped to
  subagents), v2-plugin (createV2Context helper with get/default; new native
  unblock test), Commander snapshot regenerated (only that snapshot changed).
- Docs: new `docs/adr/0025-hard-orchestrator-defaults.md`; ADR index row and
  0021 annotations; SYSTEM_ARCHITECTURE runtime shape/mermaid/prompt/permission
  sections; README what-it-does/use/configuration. Schema untouched.
- Verification: build passes (tsc declarations); full suite 127 files /
  1,151 tests passed; coverage statements 91.56%, branches 82.68%, functions
  93.7%, lines 93.72% (thresholds 85/72/88/85). No landing-mirror drift.
- Staged the listed files and created local commit 373486f on `main` (no push).

## Next exact step

None for repo work. Optional follow-ups only:

- Install the updated plugin on the machine (local deploy) if desired.
- v2 permission-gate gap (ADR-0024/0025): `Agent.Info.permissions` is
  action/resource/effect with no equivalent, so no v2 gate; revisit if the host
  adds one.

## Incomplete items and why

- None. Follow-ups recorded in ADR-0025: mission system-transform prompt still
  injects task/background-tool text during active missions (pre-existing);
  default_agent + user-hidden Commander interaction is host-owned.

## Key decisions

- Gate precedence: registration defaults < global permission < agent-specific
  permission; non-Commander agents are byte-identical to previous behavior.
- Native type constants live in config-handler and are imported by the v2
  adapter (single source of truth; no cycle; v2 pulls no new runtime surface).
- Commander description left unchanged per instruction, even though the prompt
  is delegate-only now.
- v2 skips absent native agents instead of inventing them; no v2 gate.

## Rejected alternatives

- Local duplicate constants in the v2 adapter (divergence risk).
- v2 permission mapping via `permissions` array (no verified equivalent).
- Changing agent descriptions or version fields (out of scope by instruction).

## Known risks

- Users who explicitly hide Commander or set agent.Commander.hidden may get
  host-defined default-agent behavior (ADR-0025 limitation).
- The old compressed-conversation guidance is gone from the Commander prompt;
  subagent prompts and the mission loop are unchanged.
- Covered branches in the v2 adapter depend on host-created native agents; both
  present and absent paths are unit-tested.

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. src/plugin-handlers/config-handler.ts
4. src/agents/prompts/commander-delegate.ts
5. src/v2/agent-adapter.ts
6. tests/unit/config-handler.test.ts
7. tests/unit/v2-plugin.test.ts
8. docs/adr/0025-hard-orchestrator-defaults.md
9. README.md
10. docs/SYSTEM_ARCHITECTURE.md
