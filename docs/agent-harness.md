# Agent Harness

This project uses a project-bound agent operating system for Codex and Claude Code.

## Canonical Instructions

- `AGENTS.md` is the single source of truth for shared project policy.
- `CLAUDE.md` imports `AGENTS.md` so Claude Code receives the same instructions without duplicating content.

## Runtime Surfaces

- Codex config: `.codex/config.toml`
- Codex hooks: `.codex/hooks.json` and `.codex/hooks/*`
- Codex custom agents: `.codex/agents/*.toml`
- Claude config: `.claude/settings.json`
- Claude hooks: `.claude/hooks/*`
- Claude custom agents: `.claude/agents/*.md`
- Shared skills: `.agents/skills/*/SKILL.md`
- Claude skill surface: `.claude/skills/*` symlinks to `.agents/skills/*`

## Shared Workflows

- `docs-lookup`: read durable docs and DevDocs first, then report docs drift.
- `diff-review`: review current changes for bugs, regressions, security issues, and missing checks.
- `codebase-audit`: perform explicit bounded read-only audits of current codebase state, risks, drift, or architecture.
- `agent-setup-audit`: verify Codex and Claude harness parity.

## Startup Behavior

Both runtimes register a `SessionStart` hook for `startup|resume`. The hooks recreate `.tmp/plans/`, preserve `.tmp/plans/.gitkeep`, and delete old transient scratch files.

## Parity Rule

Any change to a Codex-specific surface must be mirrored in the equivalent Claude surface during the same task, and vice versa. Shared policy belongs in `AGENTS.md`; reusable procedures belong in `.agents/skills`; durable facts belong in `docs/`.

## References

- Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Codex hooks: https://developers.openai.com/codex/hooks
- Codex skills: https://developers.openai.com/codex/skills
- Codex subagents: https://developers.openai.com/codex/subagents
- Claude Code memory and AGENTS.md import: https://code.claude.com/docs/en/memory
- Claude Code settings: https://code.claude.com/docs/en/settings
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
