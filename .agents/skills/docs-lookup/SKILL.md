---
name: docs-lookup
description: Use for repo-context questions, onboarding, architecture lookups, or external framework/tool questions where durable project docs and DevDocs should be checked before source spelunking or web search.
---

# Docs Lookup

Use this skill when answering questions that may already be covered by durable project memory or by the project's curated DevDocs index.

## Workflow

1. Read `docs/README.md` first.
2. For external framework, library, runtime, API, or tool questions, read `docs/devdocs.md` and follow the listed official docs before using broad web search.
3. Follow only the focused docs needed for the question.
4. If project docs are missing or stale, inspect the smallest relevant source area.
5. Use broad web search only when the DevDocs entry and official docs are insufficient, stale, unavailable, or the user explicitly asks for web search.
6. Answer with the docs, official references, and source files used.
7. Flag docs drift clearly. Update docs only when the user asks, the current task creates durable knowledge, or a recurring external docs link is missing from `docs/devdocs.md`.

## Output

- Direct answer.
- Files read.
- DevDocs or official references consulted when external behavior matters.
- Docs drift or follow-up documentation needed.

## Safety

- Default to read-only.
- Do not summarize broad source trees into docs.
- Do not store secrets, credentials, local machine paths, or private runtime details in durable docs.
