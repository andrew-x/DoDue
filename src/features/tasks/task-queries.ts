import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  type QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'

import {
  mergeUserProfileTagsInTransaction,
  profileKeys,
} from '@/features/profile/profile-queries'
import {
  parseCreateTaskInput,
  parseTaskDocument,
  parseUpdateTaskInput,
} from '@/features/tasks/task-schema'
import {
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  taskPriorityRanks,
  taskStatusRanks,
  type UpdateTaskInput,
} from '@/lib/data-model'
import { getFirestoreDb } from '@/lib/firebase'
import { requireUserId } from '@/lib/firestore'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (userId: string | undefined) =>
    [...taskKeys.all, 'list', userId ?? 'signed-out'] as const,
}

export type TaskReorderListInput = {
  listKey: string
  taskIds: string[]
}

export type ReorderTasksInput = {
  movedDeadline?: string | null
  movedDoDate?: string | null
  movedStatus?: TaskStatus
  movedTaskId: string
  source: TaskReorderListInput
  target?: TaskReorderListInput
}

type UpdateTaskMutationInput = {
  task: UpdateTaskInput
  taskId: string
}

type UpdateTaskMutationContext = {
  previousTasks: Task[] | undefined
}

type ReorderTasksMutationContext = {
  previousTasks: Task[] | undefined
}

function tasksCollection(userId: string) {
  return collection(getFirestoreDb(), 'users', userId, 'tasks')
}

function taskDocument(userId: string, taskId: string) {
  return doc(tasksCollection(userId), taskId)
}

function compareTasks(first: Task, second: Task) {
  const statusRank =
    taskStatusRanks[first.status] - taskStatusRanks[second.status]

  if (statusRank !== 0) {
    return statusRank
  }

  return (
    compareOptionalDates(first.doDate, second.doDate) ||
    taskPriorityRanks[first.priority] - taskPriorityRanks[second.priority] ||
    compareOptionalDates(first.deadline, second.deadline) ||
    second.createdAt.getTime() - first.createdAt.getTime()
  )
}

function compareOptionalDates(first: string | null, second: string | null) {
  if (first === second) {
    return 0
  }

  if (first === null) {
    return 1
  }

  if (second === null) {
    return -1
  }

  return first.localeCompare(second)
}

function mapTaskDocument(snapshot: QueryDocumentSnapshot): Task {
  return parseTaskDocument(snapshot.id, snapshot.data())
}

function getTaskRankMap(taskIds: string[]) {
  return new Map(taskIds.map((taskId, index) => [taskId, index]))
}

function getOptimisticReorderedTask(
  task: Task,
  input: ReorderTasksInput,
  now: Date,
) {
  const sourceRanks = getTaskRankMap(input.source.taskIds)
  const targetRanks = input.target
    ? getTaskRankMap(input.target.taskIds)
    : undefined
  const sourceRank = sourceRanks.get(task.id)
  const targetRank = targetRanks?.get(task.id)
  const isMovedTask = task.id === input.movedTaskId
  const shouldDeleteSourceRank = Boolean(input.target && isMovedTask)
  const shouldUpdateStatus =
    isMovedTask && input.movedStatus && task.status !== input.movedStatus
  const shouldUpdateDeadline = isMovedTask && 'movedDeadline' in input
  const shouldUpdateDoDate = isMovedTask && 'movedDoDate' in input

  if (
    sourceRank === undefined &&
    targetRank === undefined &&
    !shouldDeleteSourceRank &&
    !shouldUpdateDeadline &&
    !shouldUpdateDoDate &&
    !shouldUpdateStatus
  ) {
    return task
  }

  const listOrders = { ...task.listOrders }

  if (sourceRank !== undefined) {
    listOrders[input.source.listKey] = sourceRank
  }

  if (shouldDeleteSourceRank) {
    delete listOrders[input.source.listKey]
  }

  if (input.target && targetRank !== undefined) {
    listOrders[input.target.listKey] = targetRank
  }

  return {
    ...task,
    ...(shouldUpdateStatus
      ? {
          status: input.movedStatus,
          statusChangedAt: now,
        }
      : {}),
    ...(shouldUpdateDoDate
      ? {
          doDate: input.movedDoDate ?? null,
        }
      : {}),
    ...(shouldUpdateDeadline
      ? {
          deadline: input.movedDeadline ?? null,
        }
      : {}),
    listOrders,
    updatedAt: now,
  }
}

function getOptimisticUpdatedTask(
  task: Task,
  taskId: string,
  taskUpdate: Partial<UpdateTaskInput>,
  now: Date,
) {
  if (task.id !== taskId) {
    return task
  }

  return {
    ...task,
    ...taskUpdate,
    ...('status' in taskUpdate ? { statusChangedAt: now } : {}),
    updatedAt: now,
  }
}

function buildReorderPayloads(input: ReorderTasksInput) {
  const updatedAt = serverTimestamp()
  const payloads = new Map<string, Record<string, unknown>>()

  function getPayload(taskId: string) {
    let payload = payloads.get(taskId)

    if (!payload) {
      payload = { updatedAt }
      payloads.set(taskId, payload)
    }

    return payload
  }

  for (const [rank, taskId] of input.source.taskIds.entries()) {
    getPayload(taskId)[`listOrders.${input.source.listKey}`] = rank
  }

  if (input.target) {
    for (const [rank, taskId] of input.target.taskIds.entries()) {
      getPayload(taskId)[`listOrders.${input.target.listKey}`] = rank
    }

    const movedPayload = getPayload(input.movedTaskId)

    movedPayload[`listOrders.${input.source.listKey}`] = deleteField()

    if (input.movedStatus) {
      movedPayload.status = input.movedStatus
      movedPayload.statusChangedAt = serverTimestamp()
    }

    if ('movedDoDate' in input) {
      movedPayload.doDate = input.movedDoDate ?? null
    }

    if ('movedDeadline' in input) {
      movedPayload.deadline = input.movedDeadline ?? null
    }
  }

  return payloads
}

export function useTasks(userId: string | undefined) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const snapshot = await getDocs(tasksCollection(requireUserId(userId)))

      return snapshot.docs.map(mapTaskDocument).sort(compareTasks)
    },
    queryKey: taskKeys.list(userId),
  })
}

export function useCreateTask(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const profileId = requireUserId(userId)
      const taskRef = doc(tasksCollection(profileId))
      const task = parseCreateTaskInput(input)

      await runTransaction(getFirestoreDb(), async (transaction) => {
        const timestamp = serverTimestamp()

        await mergeUserProfileTagsInTransaction({
          tags: task.tags,
          timestamp,
          transaction,
          userId: profileId,
        })

        transaction.set(taskRef, {
          ...task,
          createdAt: timestamp,
          id: taskRef.id,
          listOrders: {},
          status: 'todo',
          statusChangedAt: timestamp,
          updatedAt: timestamp,
        })
      })

      return taskRef.id
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: taskKeys.list(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: profileKeys.detail(userId),
        }),
      ])
    },
  })
}

export function useUpdateTask(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    UpdateTaskMutationInput,
    UpdateTaskMutationContext
  >({
    mutationFn: async ({ taskId, task }) => {
      const profileId = requireUserId(userId)
      const parsedTask = parseUpdateTaskInput(task)

      await runTransaction(getFirestoreDb(), async (transaction) => {
        const timestamp = serverTimestamp()
        const statusUpdate =
          'status' in parsedTask
            ? {
                statusChangedAt: timestamp,
              }
            : {}

        if (parsedTask.tags) {
          await mergeUserProfileTagsInTransaction({
            tags: parsedTask.tags,
            timestamp,
            transaction,
            userId: profileId,
          })
        }

        transaction.update(taskDocument(profileId, taskId), {
          ...parsedTask,
          ...statusUpdate,
          updatedAt: timestamp,
        })
      })
    },
    onError: (_error, _input, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(userId), context.previousTasks)
      }
    },
    onMutate: async ({ taskId, task }) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.list(userId),
      })

      const previousTasks = queryClient.getQueryData<Task[]>(
        taskKeys.list(userId),
      )
      const parsedTask = parseUpdateTaskInput(task)
      const now = new Date()

      queryClient.setQueryData<Task[]>(taskKeys.list(userId), (tasks) =>
        tasks?.map((cachedTask) =>
          getOptimisticUpdatedTask(cachedTask, taskId, parsedTask, now),
        ),
      )

      return { previousTasks }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.list(userId),
      })
    },
    onSuccess: (_data, { task }) => {
      if ('tags' in task) {
        void queryClient.invalidateQueries({
          queryKey: profileKeys.detail(userId),
        })
      }
    },
  })
}

export function useReorderTasks(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    ReorderTasksInput,
    ReorderTasksMutationContext
  >({
    mutationFn: async (input: ReorderTasksInput) => {
      const profileId = requireUserId(userId)
      const batch = writeBatch(getFirestoreDb())
      const payloads = buildReorderPayloads(input)

      for (const [taskId, payload] of payloads) {
        batch.update(taskDocument(profileId, taskId), payload)
      }

      await batch.commit()
    },
    onError: (_error, _input, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(userId), context.previousTasks)
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.list(userId),
      })

      const previousTasks = queryClient.getQueryData<Task[]>(
        taskKeys.list(userId),
      )
      const now = new Date()

      queryClient.setQueryData<Task[]>(taskKeys.list(userId), (tasks) =>
        tasks?.map((task) => getOptimisticReorderedTask(task, input, now)),
      )

      return { previousTasks }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.list(userId),
      })
    },
  })
}

export function useDeleteTask(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      await deleteDoc(taskDocument(requireUserId(userId), taskId))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.list(userId),
      })
    },
  })
}
