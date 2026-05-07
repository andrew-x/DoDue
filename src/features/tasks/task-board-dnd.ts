import { arrayMove } from '@dnd-kit/helpers'
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'

import type { Task } from '@/lib/data-model'

import {
  type TaskBoard as TaskBoardModel,
  taskListKeys,
} from './task-board-model'
import { getTaskDragData } from './task-dnd'
import type { ReorderTasksInput } from './task-queries'

type CanDropTask = (sourceListKey: string, targetListKey: string) => boolean

export function canDropTaskBetweenLists(
  sourceListKey: string,
  targetListKey: string,
  todayDateListKey: string,
) {
  return (
    sourceListKey === targetListKey ||
    canMoveBetweenDateLists(sourceListKey, targetListKey) ||
    (sourceListKey === todayDateListKey &&
      targetListKey === taskListKeys.todayInProgress) ||
    (sourceListKey === taskListKeys.todayInProgress &&
      targetListKey === todayDateListKey)
  )
}

export function getTaskListsByKey(
  taskBoard: TaskBoardModel,
  todayDateListKey: string,
) {
  return new Map<string, Task[]>([
    [taskListKeys.todayInProgress, taskBoard.todayTasks.inProgress],
    [todayDateListKey, taskBoard.todayTasks.scheduled],
    [taskListKeys.todayDone, taskBoard.todayTasks.done],
    [taskListKeys.backlog, taskBoard.backlogTasks],
    [taskListKeys.done, taskBoard.doneTasks],
    [taskListKeys.triageInbox, taskBoard.triageTasks.inbox],
    [taskListKeys.triagePastDoDate, taskBoard.triageTasks.pastDoDate],
    [taskListKeys.triageDueDatePast, taskBoard.triageTasks.dueDatePast],
    [
      taskListKeys.triageDoDateAfterDeadline,
      taskBoard.triageTasks.doDateAfterDeadline,
    ],
    ...taskBoard.upcomingDays.map((day) => [day.listKey, day.tasks] as const),
  ])
}

export function handleTaskBoardDragOver({
  canDropTask,
  event,
}: {
  canDropTask: CanDropTask
  event: DragOverEvent
}) {
  const listKeys = getDragOperationListKeys(event)

  if (
    listKeys &&
    !canDropTask(listKeys.sourceListKey, listKeys.targetListKey)
  ) {
    event.preventDefault()
  }
}

export function handleTaskBoardDragEnd({
  canDropTask,
  event,
  onReorderTasks,
  taskListsByKey,
}: {
  canDropTask: CanDropTask
  event: DragEndEvent
  onReorderTasks: (input: ReorderTasksInput) => void
  taskListsByKey: Map<string, Task[]>
}) {
  if (event.canceled) {
    return
  }

  const { source } = event.operation

  if (!isSortable(source)) {
    return
  }

  const sourceData = getTaskDragData(source.data)
  const sourceListKey =
    getStringListKey(source.initialGroup) ?? sourceData?.listKey
  const targetListKey =
    getTargetListKey(event.operation.target) ?? getStringListKey(source.group)
  const movedTaskId = sourceData?.taskId

  if (!sourceListKey || !targetListKey || !movedTaskId) {
    return
  }

  if (!canDropTask(sourceListKey, targetListKey)) {
    return
  }

  const sourceTasks = taskListsByKey.get(sourceListKey)
  const targetTasks = taskListsByKey.get(targetListKey)

  if (!sourceTasks || !targetTasks) {
    return
  }

  const sourceIndex = getTaskIndex(
    sourceTasks,
    movedTaskId,
    source.initialIndex,
  )

  if (sourceIndex === -1) {
    return
  }

  if (sourceListKey === targetListKey) {
    const targetIndex = getDropTargetIndex({
      fallbackIndex: source.index,
      maxIndex: sourceTasks.length - 1,
      target: event.operation.target,
    })
    const reorderedTasks = arrayMove(sourceTasks, sourceIndex, targetIndex)
    const taskIds = reorderedTasks.map((task) => task.id)

    if (areTaskIdsEqual(sourceTasks, taskIds)) {
      return
    }

    onReorderTasks({
      movedTaskId,
      source: {
        listKey: sourceListKey,
        taskIds,
      },
    })

    return
  }

  const movedTask = sourceTasks[sourceIndex]

  if (!movedTask) {
    return
  }

  const sourceTaskIds = sourceTasks
    .filter((task) => task.id !== movedTaskId)
    .map((task) => task.id)
  const targetWithoutMovedTask = targetTasks.filter(
    (task) => task.id !== movedTaskId,
  )
  const targetIndex = getDropTargetIndex({
    fallbackIndex: source.index,
    maxIndex: targetWithoutMovedTask.length,
    target: event.operation.target,
  })
  const targetWithMovedTask = [...targetWithoutMovedTask]
  targetWithMovedTask.splice(targetIndex, 0, movedTask)
  const movedStatus = getCrossListMovedStatus(sourceListKey, targetListKey)
  const movedDateUpdate = getCrossListMovedDateUpdate(movedTask, targetListKey)

  if (!movedStatus && !movedDateUpdate) {
    return
  }

  onReorderTasks({
    ...(movedDateUpdate ?? {}),
    ...(movedStatus ? { movedStatus } : {}),
    movedTaskId,
    source: {
      listKey: sourceListKey,
      taskIds: sourceTaskIds,
    },
    target: {
      listKey: targetListKey,
      taskIds: targetWithMovedTask.map((task) => task.id),
    },
  })
}

function getCrossListMovedStatus(sourceListKey: string, targetListKey: string) {
  if (targetListKey === taskListKeys.todayInProgress) {
    return 'in-progress'
  }

  if (sourceListKey === taskListKeys.todayInProgress) {
    return 'todo'
  }

  return null
}

function getCrossListMovedDateUpdate(task: Task, targetListKey: string) {
  const targetDateList = getDateTaskListInfo(targetListKey)

  if (!targetDateList) {
    return null
  }

  if (targetDateList.field === 'doDate') {
    if (task.doDate === targetDateList.date) {
      return null
    }

    return { movedDoDate: targetDateList.date }
  }

  if (task.deadline === targetDateList.date) {
    return null
  }

  return { movedDeadline: targetDateList.date }
}

function getDragOperationListKeys(event: DragOverEvent) {
  const { source, target } = event.operation

  if (!isSortable(source)) {
    return null
  }

  const sourceListKey =
    getStringListKey(source.initialGroup) ??
    getStringListKey(source.group) ??
    getTaskDragData(source.data)?.listKey
  const targetListKey = getTargetListKey(target)

  if (!sourceListKey || !targetListKey) {
    return null
  }

  return {
    sourceListKey,
    targetListKey,
  }
}

function getTargetListKey(
  target:
    | DragEndEvent['operation']['target']
    | DragOverEvent['operation']['target'],
) {
  if (!target) {
    return null
  }

  if (isSortable(target)) {
    return getStringListKey(target.group)
  }

  return getTaskDragData(target.data)?.listKey ?? null
}

function canMoveBetweenDateLists(sourceListKey: string, targetListKey: string) {
  const sourceDateList = getDateTaskListInfo(sourceListKey)
  const targetDateList = getDateTaskListInfo(targetListKey)

  return Boolean(
    sourceDateList &&
      targetDateList &&
      sourceDateList.field === targetDateList.field,
  )
}

function getDateTaskListInfo(listKey: string) {
  if (listKey.startsWith('date:')) {
    return {
      date: listKey.slice('date:'.length),
      field: 'doDate',
    } as const
  }

  if (listKey.startsWith('due-date:')) {
    return {
      date: listKey.slice('due-date:'.length),
      field: 'deadline',
    } as const
  }

  return null
}

function getDropTargetIndex({
  fallbackIndex,
  maxIndex,
  target,
}: {
  fallbackIndex: number
  maxIndex: number
  target: DragEndEvent['operation']['target']
}) {
  const targetIndex = isSortable(target) ? target.index : fallbackIndex

  return clampIndex(targetIndex, 0, maxIndex)
}

function getStringListKey(value: unknown) {
  return typeof value === 'string' ? value : null
}

function getTaskIndex(tasks: Task[], taskId: string, fallbackIndex: number) {
  if (tasks[fallbackIndex]?.id === taskId) {
    return fallbackIndex
  }

  return tasks.findIndex((task) => task.id === taskId)
}

function clampIndex(index: number, min: number, max: number) {
  return Math.min(Math.max(index, min), max)
}

function areTaskIdsEqual(tasks: Task[], taskIds: string[]) {
  return (
    tasks.length === taskIds.length &&
    tasks.every((task, index) => task.id === taskIds[index])
  )
}
