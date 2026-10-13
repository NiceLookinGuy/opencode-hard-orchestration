# Agent Memory — opencode-hard-orchestration

Last updated: 2026-10-13 23:15 KST

## Current task

Fork rework of `agnusdei1207/opencode-orchestrator` @ 2.0.15 into
`opencode-hard-orchestration` 0.1.0 is published: GitHub fork
`https://github.com/NiceLookinGuy/opencode-hard-orchestration` exists and
`main` (3522429 at time of push) is pushed there. Remaining Phase 2 work is
verifying the install forms against the real repo.

## Last completed step

- Phase 2a publish: forked upstream to
  `NiceLookinGuy/opencode-hard-orchestration` via
  `gh repo fork --clone=false --fork-name` (note: `--remote` is rejected by
  gh when a repo argument is given; remotes were rearranged manually).
  Local remotes: `origin` = fork (fetch+push), `upstream` =
  `agnusdei1207/opencode-orchestrator`. Pushed `main` f88f00a..3522429
  (fast-forward, no force). No upstream writes and no PRs.
- Phase 1b docs/meta (local, now pushed): README rewritten for the fork
  (MIT badge only, git installs, no npm/options/missions); LICENSE keeps the
  original text and adds "Copyright (c) 2026 NiceLookinGuy (fork
  modifications)"; CONTRIBUTING.md, `user-prompt/`, landing files
  (`public/**`, root `index.html`, `css/`, `js/`, `assets/`, `favicon.svg`,
  `.nojekyll`) deleted.
- docs pruned to ADR-0021 (superseded by ADR-0026), ADR-0022/0024/0025
  (fork annotations; 0024 upstream issue link stripped), new
  `docs/adr/0026-hard-orchestration-fork-scope.md`, ADR index rewritten.
  Deleted: SYSTEM_ARCHITECTURE, KNOWLEDGE-SEARCH-DEEP-DIVE,
  DEVELOPERS_NOTE, assets, histories, release, reviews, ADRs 0001-0020/0023.
- Baseline and post-change `npm test`: 15 files / 86 tests pass.
- Evidence for doc claims: forced `default_agent` and gate in
  `src/plugin-handlers/config-handler.ts:25-29,137`; delegate-only prompt in
  `src/agents/commander.ts`; v2 adapter `src/v2/agent-adapter.ts`; guards in
  `src/index.ts:20-21`, `src/v2/setup.ts:28-32`,
  `src/plugin-handlers/text-complete-handler.ts`.

## Next exact step

Phase 2b (needs user request): verify the v1 config git spec and v2
`opencode plugin add github:...` install forms against
`NiceLookinGuy/opencode-hard-orchestration`.

## Incomplete items and why

- No known repo gaps. v2 permission gate is impossible with the current
  `Agent.Info.permissions` shape (ADR-0024/0025); v2 has no text-complete hook,
  so thinking-tag cleanup is v1-only.

## Key decisions

- Strip scope: keep only Commander registration (forced default, delegate-only
  prompt, hard gate), native subagent unblocking, and the two reliability
  guards (oversized tool-result truncation, PR #53 rationale; v1 thinking-tag
  cleanup, issue #50 rationale).
- Removed: missions/mission loop, task tools, slash commands, plugin tools,
  options system, knowledge/memory subsystems, Rust CLI, landing site,
  `/server` split runtime.
- `dist/` stays committed so git installs run without a build step; no npm
  publish. Version reset to 0.1.0.
- Minimal `customRendering` boolean read retained in `src/index.ts:16` as a
  deliberate single-option exception (WebUI rendering regression, issue #52),
  documented in ADR-0026.

## Rejected alternatives

- Keeping mission/task machinery or the options system (contradicts the fork).
- Publishing to npm (git-only distribution decided).
- Deleting `customRendering` entirely (would regress WebUI rendering).
- Documenting an unverified raw v2 config example for git specs (only the
  verified v2 CLI form is documented).

## Known risks

- v2 gate gap: on OpenCode 2 installing the plugin does not restrict
  Commander's tools; only forced default and subagent unblocking apply.
- Users who explicitly hide Commander may get host-defined default-agent
  behavior (ADR-0025 limitation).
- Kept pre-fork ADRs contain historical references to removed modules; the
  annotations in each file and ADR-0026 explain this.

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. docs/adr/0026-hard-orchestration-fork-scope.md
4. src/index.ts
5. src/plugin-handlers/config-handler.ts
6. src/v2/setup.ts
7. README.md
8. docs/adr/0025-hard-orchestrator-defaults.md
