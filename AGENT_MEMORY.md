# Agent Memory — opencode-hard-orchestration

Last updated: 2026-10-18 05:45 KST

## Current task

plan/build native agents use mode "all" on both v1 and v2 paths so they stay
selectable in the TUI agent switcher and remain Commander delegation targets.
Done: source, tests, docs, dist, commit `d7683e1`, push, isolated verify.

## Last completed step

- Changed `NATIVE_DEMOTED_TYPES` → `NATIVE_BIDIRECTIONAL_TYPES` and set
  plan/build `mode: "all"` in `src/plugin-handlers/config-handler.ts` (v1) and
  `src/v2/agent-adapter.ts` (v2); unhide/undisable behavior unchanged.
- Schema evidence: v1 `@opencode-ai/sdk` 1.18.34 `AgentConfig.mode` union and
  v2 `@opencode/schema` 2.0.22 `Config.Agent` literals both include `"all"`
  (`dist/gen/types.gen.d.ts:848`; `dist/config/agent.js:13`). v1 gets `"all"`
  too; no v1/v2 divergence.
- Tests: baseline 17 files / 103 tests → final 17 files / 103 tests pass;
  coverage thresholds pass (lines 99.41 / stmts 96.15 / funcs 97.61 /
  branches 90.98); `tsc --noEmit` clean; `build:dist` rebuilt.
- Docs: README, ADR-0025 point 4, ADR-0026 point 2, ADR-0027 item 7 +
  consequences. Commander prompt and snapshots unchanged (table "Mode" column
  still "subagent" = delegation targets, still true).
- Commit `d7683e1` (source + dist + tests + docs) pushed to origin/main.
- Fresh isolated verify (HOME=/tmp/opencode/fv3-home,
  XDG_CACHE_HOME=/tmp/opencode/fv3-cache,
  OPENCODE_CONFIG_DIR=/tmp/opencode/fv3-config, port 4325, now stopped; auth =
  Basic user `opencode` + server password from the serve log): installed
  dist/index.js sha256 equals repo HEAD; plan/build `mode="all" hidden=false`;
  scout `mode="subagent" hidden=false`; Commander permissions
  `*:*:deny, subagent:*:allow, question:*:allow, browser:*:deny`; subagent
  catalog filter `mode!=="primary"` includes build,general,explore,plan,scout.
- Live service pid 33777 not restarted; `/home/matth/.config/opencode`
  untouched.

## Next exact step

None pending. The live 33777 service keeps the pre-change code in memory; it
picks up `d7683e1` on the user's next `opencode service restart`.

## Incomplete items and why

- v1 runtime mode `"all"` not exercised live (no v1 server in this
  environment); evidence is the pinned SDK schema plus unit tests.
- Fresh-install verify used the new /tmp/opencode/fv3-* scratch; other
  /tmp/opencode files (del-*, agent-list*) belong to another session and were
  left alone.

## Key decisions

- `"all"` on both paths because both host schemas accept it; keeps TUI
  selectability (TUI filters `mode!=="subagent"`) and delegation (subagent
  catalog filters `mode!=="primary"`).
- Constant renamed to `NATIVE_BIDIRECTIONAL_TYPES`; function name
  `unblockNativeSubagentTypes` kept (unhide/undisable still applies to the
  subagent types).
- ADRs annotated, not rewritten: history preserved, current behavior
  corrected.

## Rejected alternatives

- Leaving v1 at `"subagent"` (would diverge from v2 with no schema reason).
- Keeping the `NATIVE_DEMOTED_TYPES` name (misleading after the change).

## Known risks

- v1 runtime handling of mode `"all"` rests on the SDK 1.18.34 type union, not
  a live v1 server run.
- Absolute-path local installs only work with the committed `server.js` shim
  (unchanged).

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. src/plugin-handlers/config-handler.ts
4. src/v2/agent-adapter.ts
5. tests/unit/config-handler.test.ts
6. docs/adr/0027-v2-hard-gate-and-scout.md
