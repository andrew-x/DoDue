---
name: agent-setup-audit
description: Use when creating, changing, or reviewing the project-bound Codex and Claude agent harness for runtime parity.
---

# Agent Setup Audit

Use this skill whenever agent instructions, hooks, skills, subagents, or runtime config change.

## Workflow

1. Check `AGENTS.md` and `CLAUDE.md` for canonical-instruction parity.
2. Check `.agents/skills/*/SKILL.md` and `.claude/skills/*` symlinks.
3. Check `.codex/config.toml`, `.codex/hooks.json`, and `.codex/hooks/*`.
4. Check `.claude/settings.json` and `.claude/hooks/*`.
5. Check `.codex/agents/*.toml` and `.claude/agents/*.md`.
6. Validate JSON, TOML, shell syntax, executable bits, and symlink targets.

## Output

- Parity matrix for instructions, hooks, subagents, and skills.
- Validation performed.
- Any drift, missing mirror, or user-level leakage.

## Safety

- Keep all changes project-local.
- Do not write to `~/.codex`, `~/.claude`, or other user-level runtime paths.
- When changing one runtime surface, mirror the other runtime surface in the same task.

