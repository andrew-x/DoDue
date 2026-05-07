---
name: diff-review
description: Use to review current uncommitted or branch changes for correctness, regressions, security issues, and missing verification.
---

# Diff Review

Use this skill for code review, PR review, or before handing off a completed change.

## Workflow

1. Inspect `git status --short`.
2. Review the relevant diff against the intended base or current worktree.
3. Prioritize bugs, behavior regressions, security/privacy issues, data-loss risks, and missing tests.
4. Run or recommend the narrowest meaningful checks for the changed surface.
5. Avoid style-only findings unless they hide a real maintainability or correctness risk.

## Output

- Findings first, ordered by severity.
- Each finding includes a file and line reference when possible.
- Open questions or assumptions.
- Verification performed or still missing.

## Safety

- Default to read-only.
- Do not revert unrelated changes.
- If asked to fix findings, keep edits scoped to the reviewed change.

