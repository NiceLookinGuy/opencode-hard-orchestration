# Agent Memory — opencode-hard-orchestration

Last updated: 2026-10-18 04:55 KST

## Current task

OpenCode 2 hard gate + scout subagent: implemented, tested, built, committed
(`341d8ef`), installed locally by absolute path, and verified on an isolated
2.0.32 server. Waiting on the user to restart the live service.

## Last completed step

- Verified in the 2.0.32 binary: agent editor upserts via
  `agents.get(id) ?? Agent.Info.default(id)`; engine matches rules with
  `findLast`, short-circuits deny before hooks, appends config rules, then
  runs the mutable `permission.evaluate` hook; agent rules default to
  `[{*:*:deny}]` when unset; `task`→`subagent` and `subagent_type`→`agent`.
- Implemented: `COMMANDER_GATE` + `enforceCommanderGate` + `SCOUT_RULESET`
  (`src/v2/permission-gate.ts`), v2 prompt rewrite (`src/v2/prompt-adapter.ts`),
  scout definition + prompt (`src/agents/scout.ts`,
  `src/agents/prompts/scout-research.ts`), Commander gate/scout upsert in
  `src/v2/agent-adapter.ts`, permission hook + Commander tool strip in
  `src/v2/setup.ts`.
- Tests: baseline 15 files / 86 tests → final 17 files / 103 tests pass;
  coverage thresholds pass (lines 99.41 / stmts 96.15 / funcs 97.61 /
  branches 90.98); `tsc --noEmit` clean; `build:dist` reproducible.
- Commit `341d8ef` (source + dist + docs + tests + root `server.js`).
- Install: `/home/matth/.config/opencode/opencode.json` plugin entry replaced
  with `/home/matth/Projects/skills/opencode-hard-orchestration`; backup at
  `/home/matth/.config/opencode/opencode.json.bak.20261017225144`. Caveman
  entry untouched. Live service pid 15384 not restarted.
- Isolated verify (`OPENCODE_CONFIG_DIR=/tmp/opencode/verify-config`, port
  4319, now stopped): `scout` present mode `subagent` hidden `false` with the
  research ruleset; Commander permissions = 3 gate rules + host-appended
  `browser:*:deny`; Commander prompt has `subagent(agent=` and no
  `subagent_type`.

## Next exact step

User restarts the live service to load the new config entry:

```sh
opencode service restart
```

This kills pid 15384 and the running TUI session — do it from the user's own
terminal, not from an agent session.

## Incomplete items and why

- Live model-level deny/allow (shell instruction to Commander) not exercised:
  the Commander prompt may refuse it and it costs model tokens; config dump +
  unit tests + binary-verified engine are the evidence instead.
- No push to GitHub; only the local commit exists.

## Key decisions

- Gate = agent ruleset (first layer) + `permission.evaluate` hook (backstop):
  session rules merge after agent rules and config rules append after both,
  so a later allow can un-deny; the hook can only harden.
- Commander requests are stripped to `subagent`/`task`/`question` in the
  session context hook; requests without a delegation tool are untouched.
- Scout is upserted only on v2 (not added to `AGENTS`) so the v1 path and its
  invariants stay intact; its ruleset mirrors live `explore` actions minus
  shell, deny-by-default, `subagent` recursion denied.
- Root `server.js` shim added because 2.0.32 resolves an absolute directory
  plugin entry to `<dir>/server` or `<dir>/index` (verified via
  `Bun.resolveSync`) and silently drops the entry otherwise. Git installs use
  the package entrypoint and never touch the shim; `files` excludes it.

## Rejected alternatives

- Config-file scout in `opencode.json` (pushes work to users).
- Aliasing `scout` to native `general` (loses research-only prompt/ruleset).
- Scout ruleset of `[{* allow},{subagent deny}]` (fallback only; all action
  names were verified live, so a deny-by-default allowlist was used).

## Known risks

- Hook-order risk: the backstop assumes `permission.evaluate` runs after rule
  evaluation (true on 2.0.32); a host reordering would weaken only layer two.
- v1/v2 override parity: v1 gate is overridable by user config; v2 gate is
  not. Documented in ADR-0027.
- The host appends `{browser:*:deny}` to every agent after our transform, so
  live Commander permissions show 4 rules, not the exact 3 (unit tests pin 3).
- Absolute-path local installs only work with the committed `server.js`; if
  it is deleted, the entry is dropped silently again.

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. src/v2/setup.ts
4. src/v2/agent-adapter.ts
5. src/v2/permission-gate.ts
6. src/v2/prompt-adapter.ts
7. tests/unit/v2-plugin.test.ts
8. docs/adr/0027-v2-hard-gate-and-scout.md
