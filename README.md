<div align="center">
  <h1>OpenCode Hard Orchestration</h1>
  <p>Orchestrator-only Commander for OpenCode. Delegate, distill, done.</p>

  [![MIT License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)
</div>

## What it does

Installing the plugin turns every OpenCode session into a delegation loop:

- **Forced default Commander.** `default_agent` is set to `Commander` on install, so requests land on the orchestrator instead of a native agent.
- **Permission hard gate.** Commander can delegate and ask, and nothing else. OpenCode 1 registers the permission `{"*": "deny", "task": "allow", "question": "allow"}`; OpenCode 2 replaces Commander's `permissions` ruleset with the same gate, enforces it again in a `permission.evaluate` hook, and strips every other tool from Commander requests.
- **Native subagents unblocked.** `explore`, `general`, and native `scout` are unhidden when the host exposes them, and `plan`/`build` are demoted to subagents so Commander can hand research and implementation to them.
- **Scout subagent.** `scout` is research-only: it version-matches dependencies, answers from external docs, cites exact URLs, and never edits code. Its ruleset allows `read`, `grep`, `glob`, `webfetch`, and `websearch`, and denies subagent recursion. OpenCode 2 has no native scout, so the v2 adapter upserts one; on OpenCode 1 scout is a host-native type that gets unblocked.
- **User overrides win on OpenCode 1.** There the gate is a registration default, so global `permission` and `agent.Commander.permission` override it. On OpenCode 2 the gate is enforced at request time and cannot be overridden by configuration.

No missions, no task management, no plugin tools, no slash commands.

## Why this fork / rework

This is a rework of [agnusdei1207/opencode-orchestrator](https://github.com/agnusdei1207/opencode-orchestrator) that keeps one workflow: the Commander as an orchestrator-only layer. The trade is deliberate: the Commander spends more tokens on delegation and distillation, and in exchange produces more distilled outputs and higher work quality. Intentionally removed from the upstream: missions, task tools, slash commands, the Rust CLI, the landing site, and the plugin options (`agentConcurrency`, `missionLoop`, ...).

## Install

Requires Node.js `>=24.15.0`. Not published to npm; install from git. The repository commits its `dist/` build so git installs work without a build step.

OpenCode 1 — add to `opencode.json(c)`:

```jsonc
{
  "plugin": ["opencode-hard-orchestration@git+https://github.com/NiceLookinGuy/opencode-hard-orchestration.git#main"]
}
```

OpenCode 2 — install through the CLI:

```sh
opencode plugin add github:NiceLookinGuy/opencode-hard-orchestration
opencode plugin list
```

To remove: delete the `opencode.json(c)` entry on OpenCode 1, or run `opencode plugin remove <installed-target>` on OpenCode 2 (the target shown by `opencode plugin list`).

Local development on OpenCode 2 — point the config at the repository directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-hard-orchestration"]
}
```

OpenCode 2 resolves an absolute directory entry to `<directory>/server` (or `<directory>/index`), not the package entrypoint, so this repository ships a root `server.js` shim that re-exports `dist/`. The shim is not part of the npm/git package (`files` excludes it); git installs resolve the package entrypoint and never need it.

## Use

Send a request. Commander interviews you with `question` until the task is clear, then delegates through the native delegation tool — `task` on OpenCode 1, `subagent` on OpenCode 2. There are no slash commands. Its delegate pool is `explore`, `general`, `scout`, plus demoted `plan` and `build`.

## Configuration

No plugin options. Installing the plugin forces `default_agent = "Commander"` and gates Commander to delegation and `question`. On OpenCode 1 the gate is the registration permission `{"*": "deny", "task": "allow", "question": "allow"}` with precedence registration default < global `permission` < `agent.Commander.permission`, so your overrides always win. On OpenCode 2 the gate is a hard `permissions` ruleset (`*` deny, `subagent`/`question` allow) re-enforced by a `permission.evaluate` hook, and Commander requests are reduced to those two tools. Permissions of other agents are untouched; `scout` carries its own research ruleset.

## Reliability hooks

- **Oversized tool-result truncation.** Parts over 200,000 characters are capped before the request reaches the model, so one huge tool result cannot break every later turn. Runs on OpenCode 1 (`experimental.chat.messages.transform`) and OpenCode 2 (session `context` hook).
- **Thinking-tag cleanup.** On OpenCode 1 only, a finalized text part that is exactly `</assistant-thinking></think>` is blanked.

## Development

```sh
npm ci
npm run build:dist   # esbuild bundle + tsc declarations into dist/
npm test             # vitest
```

The build script is `build:dist`, not `build`. npm's git-dependency prepare step runs a nested `npm install` for any package with a `build`, `prepare`, `preinstall`, `install`, `postinstall`, or `prepack` script, which fails inside the compiled OpenCode binary and breaks `opencode plugin add github:NiceLookinGuy/opencode-hard-orchestration` (anomalyco/opencode#49704). Rename it back only once that upstream issue is fixed.

`dist/` is committed because git installs execute the built output; rebuild and commit it alongside source changes.

## Fork notes / attribution

Forked from [agnusdei1207/opencode-orchestrator](https://github.com/agnusdei1207/opencode-orchestrator) at version 2.0.15 (MIT). Divergences from the upstream:

- Renamed to `opencode-hard-orchestration`, version reset to 0.1.0, git-only distribution.
- Removed missions and the mission loop, task/background tools, slash commands, the options system, the knowledge/memory subsystems, the Rust CLI, and the landing site.
- Kept the hard-orchestration core: forced default Commander, delegate-only prompt, permission gate, native subagent unblocking, and the two reliability guards.

## License

[MIT](LICENSE) © agnusdei1207 and NiceLookinGuy (fork modifications)
