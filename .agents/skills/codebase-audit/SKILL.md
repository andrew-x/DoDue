---
name: codebase-audit
description: Use only for explicit bounded read-only audits of the codebase's current state, risks, drift, or architecture against a stated scope.
---

# Codebase Audit

Use this skill when the task asks for a current-state audit, architecture assessment, risk inventory, drift check, or similar read-only review with a clear scope.

Do not use this skill for routine codebase orientation, normal source reading before implementation, simple symbol/file lookup, or implementation planning. For those tasks, use targeted `rg`, focused file reads, and `docs-lookup` when documentation context may exist.

## Workflow

1. State the audit question, boundary, and current-state criteria.
2. Use `docs-lookup` first when durable docs may describe the audited area.
3. Use `rg --files`, `rg`, and targeted file reads before broader exploration.
4. Trace real code paths rather than inferring from names alone.
5. Capture commands, config files, entry points, and evidence that affect the audit finding.
6. Stop when the audit question is answered.

## Output

- Findings about the audited current state, ordered by severity or importance.
- Important file references.
- Risks, unknowns, and recommended next steps.

## Safety

- Read-only unless the user explicitly asks for implementation.
- Avoid broad source dumps.
- Do not modify generated files, lockfiles, or runtime config during an audit.
