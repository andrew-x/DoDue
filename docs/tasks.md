# Task Data Model

User profile documents live at `/users/{userId}`. Tasks live under each profile
at `/users/{userId}/tasks/{taskId}`. The client generates `taskId` with
Firestore's random document ID helper, stores the same value in the task
document as `id`, and validates writes with Zod before sending them to
Firestore.

## Profile Fields

- `id`: Firebase Auth UID and Firestore profile document ID.
- `tags`: Remembered tag library used for task tag suggestions. Tags are
  normalized with the same rules as task tags: trim whitespace, strip one
  leading `#`, lowercase, and keep each tag to 1-64 characters. Stored values
  are lowercase and uniqueness is case-insensitive.
- `createdAt`: Server timestamp set when the profile document is first created.
- `updatedAt`: Server timestamp set when the remembered tag library changes.

The profile intentionally does not copy Firebase Auth display names, email
addresses, or other identity fields.

## Task Fields

- `id`: Firestore document ID.
- `name`: Required task title, 1-160 characters.
- `description`: Task details, up to 5000 characters.
- `doDate`: The intended "do" date as `YYYY-MM-DD`, or `null`.
- `deadline`: The due date as `YYYY-MM-DD`, or `null`.
- `priority`: One of `p1`, `p2`, `p3`, or `p4`.
- `tags`: Up to 20 strings, each 1-64 characters after trimming.
- `listOrders`: Map of manually ordered task-list keys to dense numeric ranks for
  persistent manual ordering. Current list keys include `today:in-progress`,
  `date:YYYY-MM-DD`, `due-date:YYYY-MM-DD`, `backlog`, and the `triage:*`
  sections.
- `status`: One of `backlog`, `in-progress`, `todo`, `complete`, or `archived`.
- `statusChangedAt`: Server timestamp set when the task status changes.
- `createdAt`: Server timestamp set on create.
- `updatedAt`: Server timestamp set on create and update.

## Model and Validation

- `src/lib/data-model.ts` is the canonical TypeScript data model for the app's
  Firestore shape, task field types, enum values, and shared field limits.
- `src/lib/tags.ts` owns shared tag normalization, case-insensitive uniqueness,
  suggestions, and the Zod tag schema used by task and profile validation.
- `src/features/tasks/task-schema.ts` derives Zod validation schemas from the
  central model types and constants.
- `firestore.rules` only enforces path-based ownership: an authenticated user
  can read and write documents under `/users/{uid}` when `{uid}` matches their
  Firebase Auth UID.
- Field shape, allowed values, timestamps, and immutable field expectations live
  in the central TypeScript model, client Zod validators, and write helpers.
- Signing in ensures `/users/{uid}` exists with an empty `tags` array if no
  profile document is present.
- Creating a task and saving task updates merge the saved task tags into the
  profile `tags` library in a Firestore transaction. Existing task documents are
  not scanned or backfilled, and settings edits only change future suggestions;
  they do not rename or remove tags on existing tasks.
- Task reads strip deprecated extra fields so older documents do not break the
  list while new writes stay on the current model. Legacy `completed` and
  `completedAt` values are normalized to `status` and `statusChangedAt` at read
  time. Legacy `inbox` statuses are normalized to `todo` at read time. Legacy
  tasks without `listOrders` parse with an empty ordering map.
- New tasks default to `todo`. The Inbox board section is derived from active
  `todo` tasks with no `doDate`; `backlog`, `in-progress`, `complete`, and
  `archived` are manual statuses. Status updates set `statusChangedAt` with a
  Firestore server timestamp.
- The Inbox board section is the home for active `todo` tasks without a
  `doDate`, even when they have a due date. Today's scheduled list uses
  `doDate` only, so tasks with a `doDate` equal to today appear in Today and
  due dates do not pull unscheduled work into Today. Upcoming can be grouped and
  fallback-sorted by either `doDate` or `deadline`, depending on the selected
  mode.
- Drag reorders rewrite dense ranks for the affected visible list. Cross-list
  drags are limited to date lists and Today's `For Today` / `In Progress`
  workflow. Moving between do-date lists sets `doDate` to the target date;
  moving between due-date upcoming lists sets `deadline` to the target date.
  Moving into `In Progress` sets status to `in-progress`; moving back to `For
  Today` sets status to `todo` and `doDate` to today. Status moves refresh
  `statusChangedAt`. Done and archived lists are sorted by status-change recency
  first, include title search in their full sections, and are not drag-sortable.
