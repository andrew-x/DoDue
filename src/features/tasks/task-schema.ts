import { z } from 'zod'

import {
  type CreateTaskInput,
  normalizeTaskStatus,
  type Task,
  type TaskEditablePayload,
  type TaskListOrders,
  type TaskUpdatePayload,
  taskFieldLimits,
  taskPriorities,
  taskStatuses,
  type UpdateTaskInput,
} from '@/lib/data-model'
import { firestoreTimestampSchema } from '@/lib/firestore'
import { tagSchema } from '@/lib/tags'

export const taskPrioritySchema = z.enum(taskPriorities)
export const taskStatusSchema = z.enum(taskStatuses)
const taskListOrdersSchema = z.record(
  z.string().min(1),
  z.number().int().nonnegative(),
) satisfies z.ZodType<TaskListOrders>
const legacyTaskStatusSchema = z.literal('inbox')
const taskDocumentStatusSchema = z.union([
  taskStatusSchema,
  legacyTaskStatusSchema,
])

const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

function isValidDateOnly(value: string) {
  if (!isoDateOnlyPattern.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const taskDateSchema = z
  .string()
  .regex(isoDateOnlyPattern, 'Use YYYY-MM-DD.')
  .refine(isValidDateOnly, 'Use a valid calendar date.')

export const optionalTaskDateSchema = taskDateSchema.nullable()

const taskEditablePayloadSchema = z
  .object({
    deadline: optionalTaskDateSchema,
    description: z.string().trim().max(taskFieldLimits.descriptionMaxLength),
    doDate: optionalTaskDateSchema,
    name: z.string().trim().min(1).max(taskFieldLimits.nameMaxLength),
    priority: taskPrioritySchema,
    tags: z.array(tagSchema).max(taskFieldLimits.tagsMaxCount),
  })
  .strict() satisfies z.ZodType<TaskEditablePayload>

export const createTaskInputSchema = taskEditablePayloadSchema

const taskUpdatePayloadSchema = taskEditablePayloadSchema.extend({
  status: taskStatusSchema,
}) satisfies z.ZodType<TaskUpdatePayload>

export const updateTaskInputSchema = taskUpdatePayloadSchema
  .partial()
  .strict()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    'Provide at least one task field to update.',
  ) satisfies z.ZodType<UpdateTaskInput>

export const taskDocumentSchema = taskEditablePayloadSchema
  .extend({
    completed: z.boolean().optional(),
    completedAt: firestoreTimestampSchema.nullable().optional(),
    createdAt: firestoreTimestampSchema,
    id: z.string().min(1),
    listOrders: taskListOrdersSchema.default({}),
    status: taskDocumentStatusSchema.optional(),
    statusChangedAt: firestoreTimestampSchema.optional(),
    updatedAt: firestoreTimestampSchema,
  })
  .strip()

export function parseCreateTaskInput(input: CreateTaskInput) {
  return createTaskInputSchema.parse(input)
}

export function parseUpdateTaskInput(input: UpdateTaskInput) {
  const parsed = updateTaskInputSchema.parse(input)

  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as Partial<TaskUpdatePayload>
}

export function parseTaskDocument(id: string, data: unknown): Task {
  const parsed = taskDocumentSchema.parse(data)

  if (parsed.id !== id) {
    throw new Error(`Task document ID mismatch for ${id}`)
  }

  const { completed, completedAt, status, statusChangedAt, ...taskDocument } =
    parsed
  const normalizedStatus = status
    ? normalizeTaskStatus(status)
    : completed
      ? 'complete'
      : 'todo'
  const normalizedStatusChangedAt =
    statusChangedAt ?? completedAt ?? parsed.updatedAt

  return {
    ...taskDocument,
    createdAt: taskDocument.createdAt.toDate(),
    status: normalizedStatus,
    statusChangedAt: normalizedStatusChangedAt.toDate(),
    updatedAt: taskDocument.updatedAt.toDate(),
  }
}
