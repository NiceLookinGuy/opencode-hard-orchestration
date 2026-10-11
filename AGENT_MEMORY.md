# Agent Memory - OCO Session

Last updated: 2026-10-11 KST

## Current task

Review PR #53, verify behavior and compatibility, approve with a short thank-you,
commit/push corrections, and publish patch release 2.0.14.
Starting main was clean at fffb647 and matched origin/main.

## Last completed step

- Opened the PR changes, plugin entrypoints, installed host types, consumers,
  tests, architecture documentation, and release scripts/workflow.
- Baseline: build/typecheck and 124 files / 1,113 tests passed.
- Original PR: 125 files / 1,121 tests passed with coverage.
- Reproduced six failures across two problems: oversized file URIs remained
  invalid media parts; serialized object tool results bypassed the limit.
- Commit c6d6cde replaces large tool files with text notices and caps serialized
  objects, preserving error discriminators and small values. Eleven added
  compatibility tests cover both real registered plugin callbacks, thresholds,
  reasoning, repeat calls, files, structured errors and cyclic values.
- Updated architecture documentation; pushed to the editable contributor branch.
- Final PR CI 38095875366 passed TypeScript and Rust gates.
- Approved PR #53 with 'Thanks for the fix!' and merged at a6c9566.
- Version commit 4a7def4 and tag v2.0.14 synchronize npm/package-lock,
  Cargo workspace/lock, and README. Full parsed manifest/lock comparison
  confirmed only release-version fields changed.
- Release preflight passed; main and tag were pushed atomically.
  Hosted release run 38096186289 attempt 2 succeeded. GitHub v2.0.14 is public;
  npm accepted publication and reports processing, but public metadata is not
  available yet.

Observed final source verification:

- Build and npx tsc --noEmit passed.
- Coverage: 126 files / 1,132 tests passed; statements 91.48%, branches 82.26%,
  functions 93.68%, lines 93.68%. Includes architecture, exports, reachability,
  cycles, lifecycle and integration suites.
- Docker Rust 1.98.1: fmt, Clippy with warnings denied, and locked workspace
  tests passed (46 CLI + 112 core).
- Production npm audit reported zero vulnerabilities; dependency tree passed.
- Packed install of 2.0.14 passed root/server exports and configuration
  isolation. Local CLI skipped because binaries were not rebuilt for the bump.
- OpenCode 1.18.35 with SDK 1.18.34: 18 isolated native-host checks passed,
  including actual 400,000-character outgoing input truncation with original
  stored history preserved.
- First native QA cold bootstrap took about 111 seconds, exceeding the harness's
  60-second first-request timeout. A scratch harness uses 180 seconds.
  A large web-document fixture failed its original output-prefix expectation;
  it did not demonstrate a guard defect. Final QA keeps the normal web fixture
  and adds a large-text provider-boundary check.
- Changed source/test/doc files were reopened. Imports, barrels, V1 hook key,
  V2 registration, content discriminators and provider serialization were traced.
  git diff --check passed. No dependency/configuration/schema changes or
  unrelated refactoring were introduced.

- First hosted release attempt failed on a Docker Hub authentication timeout
  and one existing ESLint fixture assertion. Opened lsp.rs/process.rs; 100
  isolated repetitions and 10 complete locked workspace repetitions passed.
  The exact cause of the single Rust failure is unresolved; all gates passed
  on the complete second attempt without source changes or disabled checks.
- All five published assets passed format/architecture/embedded-version checks
  after download, and SHA-256 matched GitHub's asset digests. The published
  Windows MSVC binary passed --version, --help, pooled JSON-RPC agent listing,
  unknown-tool error handling, and shutdown. Hosted packed-install smoke passed
  CLI and configuration-isolation checks. Tag identity matches 4a7def4.

## Next exact step

Wait for npm public metadata for opencode-orchestrator@2.0.14 and verify its
shasum equals 79ffe8086108044edf8e36b04d1bf3160e13bd0b. The upload is already
accepted: do not re-publish or change the tag. If metadata remains unavailable, inspect the accepted publish log and npm
processing status before attempting any follow-up. No further source change
is planned for this review.

## Incomplete items and why

- npm public availability is pending registry processing; upload was accepted
  at 2026-10-10 23:53:01 UTC. GitHub release and all hosted gates are complete.
- Live OpenCode 2 was not run: compatibility uses installed 2.0.22 types and
  the actual registered context callback in tests.
- This snapshot is being committed/pushed after source, tag, assets and hosted
  checks were verified. Public npm availability remains an external follow-up.

## Key decisions

- Fix confirmed defects before approval; keep the contributor's original commit
  and add an ordinary correction without force-pushing.
- Reuse existing hooks/traversal with no new runtime dependency.
- Preserve error status, small results/files, standalone media, tool-call inputs,
  encrypted reasoning and provider metadata.
- Roll back via revert and a subsequent patch; never rewrite published tags.
- Sequential work with one writer and no sub-agents.

## Rejected alternatives

- An omission marker in a file URI: providers would decode it as media.
- Unlimited structured results: their serialized values can be huge.
- Convert large errors to successful text: loses the error discriminator.
- Claim all context overflow is prevented: this is a per-field safeguard.

## Known risks

- Oversized content is intentionally truncated or omitted.
- Many smaller fields can still exceed a model's total context budget.
- Standalone media, encrypted/provider replay payloads and tool inputs are
  outside the guard to preserve host/provider contracts.
- Structured-result serialization allocates JSON before capping; unexpected
  cyclic/unserializable values are ignored.
- Native host QA covers Windows OpenCode 1.18.35, not every host/model.

## Files to open first in the next session, in order

1. AGENTS.md
2. AGENT_MEMORY.md
3. src/shared/message/message-guard.ts
4. tests/unit/message-guard-compatibility.test.ts
5. src/plugin-handlers/messages-guard-handler.ts
6. src/index.ts
7. src/v2/setup.ts
8. docs/SYSTEM_ARCHITECTURE.md
9. .github/workflows/release.yml
10. scripts/release-preflight.mjs
