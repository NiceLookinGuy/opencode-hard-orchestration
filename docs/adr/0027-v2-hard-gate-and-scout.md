# ADR-0027: OpenCode 2 Hard Gate and Scout Subagent

Date: 2026-10-18 04:44 KST
Status: Implemented

## Context

ADR-0024/0025 recorded that the v2 boundary could not gate Commander: v2 had
no `Agent.Info.permissions` equivalent, agent transforms were believed unable
to create agents, and v2 was not known to run a permission hook. On OpenCode
2.0.32 all three premises are false (verified against the compiled binary and
live `opencode debug agents`):

- `AgentEditor.update(id, cb)` upserts — missing agents are created from
  `Agent.Info.default(id)`.
- `Agent.Info.permissions` is a ruleset of `{action, resource, effect}`; the
  engine merges agent and session rules, takes the last (`findLast`) matching
  rule, short-circuits deny before hooks, then appends config rules and calls
  the mutable `permission.evaluate` hook.
- v2 renamed the delegation tool from `task` to `subagent` (parameter
  `subagent_type` → `agent`); the old names execute only as deprecated aliases.

Without a gate, a v2 Commander keeps the full native tool surface, and v2 has
no `scout` agent (live agent ids: build, Commander, compaction, explore,
general, plan, summary, title).

## Options considered

1. Config-file scout (`agent.scout` in `opencode.json`). Rejected: pushes
   installation work to users, and the plugin already owns agent registration.
2. Alias `scout` to the native `general` agent. Rejected: loses the
   research-only prompt and ruleset, and misreports the delegate surface.
3. Register `scout` from the plugin through the v2 agent transform and gate
   Commander with the ruleset plus a `permission.evaluate` hook. Chosen.

## Decision

1. `COMMANDER_GATE` ruleset in `src/v2/permission-gate.ts`:
   `*:*:deny`, `subagent:*:allow`, `question:*:allow`. The v2 agent adapter
   replaces Commander's permissions with it on every transform (idempotent).
2. `enforceCommanderGate` runs as a `permission.evaluate` hook. Agent rules
   alone are not sufficient: session rules merge after agent rules and config
   rules append after both, so a later allow can un-deny an action; the hook
   forces deny for any Commander action other than `subagent`/`question`.
   Hooks can only harden an effect, never soften it.
3. The v2 context hook strips every tool from a Commander request except
   `subagent`, `task` (alias), and `question`, so the model never plans around
   tools it cannot use. Requests without a delegation tool are left untouched.
4. `scout` is upserted by the v2 adapter with mode `subagent`, hidden `false`,
   and `SCOUT_RULESET`: deny-by-default, allow `read`/`grep`/`glob`/`webfetch`/
   `websearch`, native `.env` ask/allow handling, deny `subagent` recursion.
   Action names mirror the live native `explore` agent.
5. The v2 adapter rewrites the Commander prompt: `task(subagent_type=` →
   `subagent(agent=`, `` `subagent_type` `` → `` `agent` ``, and
   `` `task` `` → `` `subagent` ``. The v1 prompt source and v1 config handler
   are unchanged; the v1 gate and tool names stay as they are.
6. scout is not added to the `AGENTS` registry, so the v1 path never
   registers it and the v1 agent-definition invariants stay intact.

## Consequences

- Verified on an isolated OpenCode 2.0.32 server: `scout` exists with mode
  `subagent`, and Commander's permissions are exactly the three gate rules.
  Unit tests pin the ruleset, the hook behavior, the tool strip, the prompt
  rewrite, and cleanup disposal.
- Override parity with v1 breaks: the v1 gate is a registration default that
  user config may override, while the v2 hook cannot be overridden by
  configuration. The v2 gate is intentionally harder; user config can still
  change other agents, and `agent.Commander.permissions` is replaced by the
  adapter on every transform.
- Hook order is the residual risk: the gate assumes `permission.evaluate`
  hooks run after rule evaluation (true on 2.0.32). A host that changes that
  order would weaken only the second layer; the ruleset stays as the first.
- Native types remain host-owned: the adapter still updates only the native
  agents the host exposes, so no fabricated native agents appear on hosts
  that rename or remove them.
- Local absolute-path installs need a root `server.js` shim: OpenCode 2.0.32
  resolves an absolute directory plugin entry to `<directory>/server` or
  `<directory>/index`, never to the package entrypoint, and silently drops
  the entry when neither exists. The repository ships the shim; git installs
  resolve the package entrypoint and are unaffected.
- Rollback is a revert of the implementing commit plus a `dist/` rebuild;
  ADR-0025's v2 limitation note is superseded by this decision.
