export const taskPriorities = ['p1', 'p2', 'p3', 'p4'] as const
export const taskStatuses = [
  'backlog',
  'in-progress',
  'todo',
  'complete',
  'archived',
] as const

export const taskFieldLimits = {
  descriptionMaxLength: 5000,
  nameMaxLength: 160,
  tagMaxLength: 64,
  tagsMaxCount: 20,
} as const

export type TaskPriority = (typeof taskPriorities)[number]
export type TaskStatus = (typeof taskStatuses)[number]
export type LegacyTaskStatus = 'inbox'

export type DateOnlyString = string

export type FirestoreTimestampLike = {
  toDate: () => Date
}

export type TaskEditablePayload = {
  deadline: DateOnlyString | null
  description: string
  doDate: DateOnlyString | null
  name: string
  priority: TaskPriority
  tags: string[]
}

export type TaskListOrders = Record<string, number>

export type TaskDocumentData = TaskEditablePayload & {
  createdAt: FirestoreTimestampLike
  id: string
  listOrders: TaskListOrders
  status: TaskStatus
  statusChangedAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export type UserProfileDocumentData = {
  createdAt: FirestoreTimestampLike
  id: string
  tags: string[]
  updatedAt: FirestoreTimestampLike
}

export type CreateTaskInput = TaskEditablePayload
export type TaskUpdatePayload = TaskEditablePayload &
  Pick<TaskDocumentData, 'status'>
export type UpdateTaskInput = Partial<TaskUpdatePayload>

export type Task = Omit<
  TaskDocumentData,
  'createdAt' | 'statusChangedAt' | 'updatedAt'
> & {
  createdAt: Date
  statusChangedAt: Date
  updatedAt: Date
}

export type UserProfile = Omit<
  UserProfileDocumentData,
  'createdAt' | 'updatedAt'
> & {
  createdAt: Date
  updatedAt: Date
}

export const taskPriorityRanks = {
  p1: 1,
  p2: 2,
  p3: 3,
  p4: 4,
} satisfies Record<TaskPriority, number>

export const taskStatusRanks = {
  'in-progress': 1,
  todo: 2,
  backlog: 3,
  complete: 4,
  archived: 5,
} satisfies Record<TaskStatus, number>

export function normalizeTaskStatus(
  status: LegacyTaskStatus | TaskStatus | undefined,
): TaskStatus {
  if (!status || status === 'inbox') {
    return 'todo'
  }

  return status
}
