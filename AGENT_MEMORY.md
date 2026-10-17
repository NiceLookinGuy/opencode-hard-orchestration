# Agent Memory — opencode-hard-orchestration

Last updated: 2026-10-18 07:05 KST

## Current task

Phase 2b is complete: both documented install forms are now verified against
the real repo, and the OpenCode 2 Git install failure
(`NpmInstallFailedError (cause: git dep preparation failed)`) is fixed and
pushed.

## Last completed step

- Root cause: `opencode plugin add github:...` installs Git deps through
  npm's `pacote`, which runs a nested `npm install` ("prepare") for any
  package whose `package.json` declares `build`, `prepare`, `preinstall`,
  `install`, `postinstall`, or `prepack` scripts, or `workspaces`. In the
  compiled opencode binary that nested npm invocation is broken, so the
  install dies with `git dep preparation failed`
  (anomalyco/opencode#49704). Both plugin repos declared a `build` script.
- Fix (this repo): renamed `"build"` → `"build:dist"` in `package.json`;
  updated `.github/workflows/ci.yml`, `README.md` (with issue reference and
  removal condition), `tests/unit/package-metadata.test.ts` (script-key pin),
  and the `dist-integrity.test.ts` failure hint. `dist/` output unchanged.
- Fix (caveman fork, separate repo): same rename plus `CHANGELOG.md` entry;
  pushed there too.
- Verification on opencode 2.0.32 (bundled Bun 1.4.2 used for local tooling):
  `bun install`, `tsc --noEmit`, `vitest run` (15 files / 86 tests pass),
  `bun run build:dist` (dist reproducible, `git status` clean for dist),
  `opencode plugin add git+file://<clone>` succeeds, and a standalone TUI run
  shows both server plugins loading and the Commander default agent active.
- Baseline before the change: same typecheck, 15 files / 86 tests pass.

## Next exact step

None required. Pushes to `main` trigger CI; if a run fails, inspect the
workflow log first.

## Incomplete items and why

- No known repo gaps. v2 permission gate is impossible with the current
  `Agent.Info.permissions` shape (ADR-0024/0025); v2 has no text-complete hook,
  so thinking-tag cleanup is v1-only.

## Key decisions

- Rename the dev build script to `build:dist` instead of keeping `build` and
  waiting on the upstream fix; the same workaround is shipped by
  `vercel/vercel-plugin` (vercel/vercel-plugin#314). `dist/` is committed, so
  consumers never needed the script.
- Keep version `0.1.0` and leave `package-metadata.test.ts`'s identity pin
  untouched; git distribution updates by commit, not version.
- Document the reason in `README.md` with the upstream issue link and a
  removal condition (rename back once anomalyco/opencode#49704 is fixed).

## Rejected alternatives

- Keeping `build` and relying on users to patch opencode (not actionable).
- Deleting the script and documenting raw `node scripts/build.mjs` (worse DX,
  breaks CI/README ergonomics).
- Renaming to `compile`/`dist` (chose `build:dist` to match the ecosystem
  precedent and the repo's existing `test:coverage` naming style).
- Version bump to 0.1.1 (would churn the identity test for no install effect).

## Known risks

- If anyone renames the script back to `build`, OpenCode 2 Git installs break
  again until anomalyco/opencode#49704 is fixed. The README note and the
  script-key test in `package-metadata.test.ts` guard this.
- v2 gate gap: on OpenCode 2 installing the plugin does not restrict
  Commander's tools; only forced default and subagent unblocking apply.
- Users who explicitly hide Commander may get host-defined default-agent
  behavior (ADR-0025 limitation).
- Kept pre-fork ADRs contain historical references to removed modules; the
  annotations in each file and ADR-0026 explain this.

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. package.json
4. README.md (Install and Development sections)
5. .github/workflows/ci.yml
6. tests/unit/package-metadata.test.ts
7. src/index.ts
8. src/plugin-handlers/config-handler.ts
