# Durable Project Memory

Read this index first for repo-context questions, then follow the smallest relevant link.

## Current Docs

- [Agent Harness](agent-harness.md): Project-bound Codex and Claude operating-system setup, parity rules, and maintenance expectations.
- [Developer Docs](devdocs.md): External documentation links agents should consult for runtimes, UI tooling, routing, server state, icons, and CSS utilities.
- [Task Data Model](tasks.md): Firestore task collection shape, field semantics, validation layers, and rule constraints.

## Project Facts

- Runtime: React 19, TypeScript, Vite.
- Package runner: Bun.
- Quality gates: `bun run lint` and `bun run build`.
- Durable memory belongs in `docs/`; transient planning belongs in `.tmp/plans/`.

## Maintenance Rules

- Add focused docs when a task discovers durable project knowledge.
- Keep this index short and link to topic pages.
- Remove or update stale entries when docs drift from the codebase or agent setup.
