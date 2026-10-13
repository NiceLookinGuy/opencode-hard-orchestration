# Architecture Decision Records

Date: 2026-09-04 00:10 KST
Status: Active — this directory is the single source of truth for design decisions.

## Process

1. Any hard-to-reverse decision gets an ADR **before** implementation ships.
2. One decision per file: `docs/adr/NNNN-short-title.md`, sequential numbers.
3. Every ADR carries a datetime (`Date: YYYY-MM-DD HH:MM KST`) and a `Status`.
4. Plans (`PLAN_*.md`) are working notes, not records: once decided, the outcome
   lives here and the plan is removed. History remains recoverable in git.
5. All documents in this project are written in English.
6. Statuses: `Proposed` → `Accepted` → `Implemented`; or `Superseded by ADR-XXXX`.

## Template

```markdown
# ADR-NNNN: Title

Date: YYYY-MM-DD HH:MM KST
Status: Proposed | Accepted | Implemented | Superseded by ADR-XXXX
Source: (migrated plan path, if any; removal date)

## Context

Why this decision was needed (2-4 sentences).

## Decision

What was decided (bullets).

## Consequences

What followed, including verification evidence and known limits.
```

## Index

The fork (ADR-0026) pruned the pre-fork records: ADRs 0001-0020 and 0023 were
deleted and remain recoverable in git history. The records below are the kept
set.

| ADR | Date (KST) | Title | Status |
| --- | --- | --- | --- |
| [0021](0021-minimal-mission-plugin.md) | 2026-09-14 17:41 | Minimal mission plugin: identity and deletion-first plan | Superseded by ADR-0026 |
| [0022](0022-opencode-1-18-plugin-boundary.md) | 2026-09-15 16:25 | OpenCode 1.18 plugin boundary and runtime separation | Implemented (pre-fork) |
| [0024](0024-opencode-2-plugin-compatibility.md) | 2026-09-20 | OpenCode 2 plugin compatibility | Implemented (pre-fork) |
| [0025](0025-hard-orchestrator-defaults.md) | 2026-10-13 21:21 | Hard orchestrator defaults on install | Accepted |
| [0026](0026-hard-orchestration-fork-scope.md) | 2026-10-13 23:13 | Fork scope — OpenCode Hard Orchestration | Implemented |
