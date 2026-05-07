# Project Agent Contract

This file is the canonical project instruction set for all coding agents. Keep domain policy here, keep repeatable workflows in `.agents/skills/*/SKILL.md`, keep durable project knowledge in `docs/`, and keep short-lived working notes in `.tmp/plans/`.

## Project Shape

- This is a React 19 + TypeScript + Vite application.
- Use Bun as the package runner because `bun.lock` is present.
- Use Tailwind CSS for application styling by default.
- Use shadcn/ui as the component library baseline.
- Use Lucide React as the icon library.
- Use Sass for custom CSS outside utility-class composition.
- Favor a sleek, professional, intuitive, minimal dark-mode UI that stays out of the user's way.
- Use Firebase for backend services: Firebase Auth for identity and Firestore for application data.
- Use the Firebase Firestore SDK directly inside TanStack Query hooks; TanStack Query owns Firestore read caching, mutation invalidation, and async server-state management.
- Use TanStack Router for page routing and route-level access control.
- Only the landing page and 404 page are public; all application pages must require Firebase Auth.
- Use Google sign-in through Firebase Auth as the primary login flow.
- Core commands:
  - `bun run dev` starts the Vite dev server on port `3000`.
  - `bun run lint` runs Biome checks for linting, formatting, and import organization.
  - `bun run format` applies Biome formatting, safe fixes, and import organization.
  - `bun run build` runs `tsc -b` and the Vite production build.
- No dedicated test script is configured yet. Until one exists, use Biome lint and build as the default quality gates.

## Collaboration

- Read the codebase before changing it. Prefer existing patterns over new abstractions.
- Keep edits tightly scoped to the user request.
- Do not revert unrelated user work. If the worktree is dirty, preserve changes you did not make.
- Surface blockers with concrete evidence: command output, file paths, or docs references.
- For reviews, lead with findings ordered by severity, then open questions, then a short summary.

## Planning Memory

- For non-trivial work, create a timestamped plan under `.tmp/plans/`.
- Include the immediate main-agent responsibility, subagents used or skipped, skills used or skipped, and a checklist with status.
- Update the plan as work changes. Do not move transient plans into `docs/`.
- The startup hooks maintain `.tmp/plans/` and remove old scratch files.

## Durable Docs

- Use `docs/` for durable project memory that should survive sessions.
- Read `docs/README.md` first for repo-context questions, then follow focused links.
- For external framework, library, runtime, API, or tool questions, read `docs/devdocs.md` and consult the listed official docs before using broad web search.
- Use broad web search only after the relevant DevDocs entry and official docs are insufficient, stale, unavailable, or the user explicitly asks for web search.
- When a recurring external reference is missing from `docs/devdocs.md`, add the canonical docs link instead of relying on ad hoc search in future tasks.
- Keep docs focused. Add or update durable docs when a task discovers project facts that future agents should not rediscover.
- Do not dump broad source summaries into docs. Prefer short, named pages with ownership, commands, architectural facts, and known caveats.

## Skills

- Shared skills live in `.agents/skills/`.
- Skills are runtime-neutral workflow modules. Put repeatable procedures there instead of expanding this root file.
- Claude consumes the same skills through symlinks in `.claude/skills/`.
- When adding, renaming, or deleting a skill, update both the shared skill directory and the Claude symlink surface in the same task.
- Use `docs-lookup` for documentation-first answers, including DevDocs-first external reference checks.
- Use `codebase-audit` only for explicit read-only current-state audits with a stated scope, not for routine codebase orientation before implementation.

## Subagents

- Main agent owns integration, decisions, verification, and user communication.
- Explorer agents are for bounded read-only discovery.
- Worker agents are for bounded implementation slices with clear file ownership.
- The `librarian` agent maintains durable docs, reads focused context, summarizes back to the main agent, avoids broad source dumps, and flags documentation drift.
- Spawn subagents only when explicitly requested or when the active runtime permits delegation and the task benefits from parallel, bounded work.

## Runtime Parity

Codex and Claude must expose equivalent project-level surfaces:

- Instructions: `AGENTS.md` is canonical; `CLAUDE.md` imports it.
- Hooks: `.codex/hooks.json` plus `.codex/hooks/*` mirrors `.claude/settings.json` plus `.claude/hooks/*`.
- Subagents: `.codex/agents/*.toml` mirrors `.claude/agents/*.md`.
- Skills: `.agents/skills/*` mirrors `.claude/skills/*` symlinks.

Whenever one runtime-specific surface changes, mirror the equivalent surface in the other runtime during the same task. Do not put this setup in user-level `~/.codex` or `~/.claude` paths.

## Engineering Quality

- Prefer `rg` and `rg --files` for search.
- Use Biome instead of ESLint and Prettier for linting, formatting, and import organization.
- Use structured parsers or native config formats for JSON, TOML, YAML, and package metadata.
- Keep secrets and private data out of logs, docs, prompts, and generated examples.
- Do not add dependencies unless the task clearly needs them and existing tools are insufficient.
- Do not introduce broad formatting churn.
- Before handing off code changes, run the narrowest meaningful verification. For this project, default to `bun run lint` and `bun run build` when source files or shared agent policy change.
