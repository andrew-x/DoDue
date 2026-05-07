import { type Task, taskPriorityRanks } from '@/lib/data-model'

import { addDaysToDateOnly, getDateOnlyValue } from './task-dates'

export type UpcomingDateMode = 'doDate' | 'deadline'

export const taskListKeys = {
  archived: 'archived',
  backlog: 'backlog',
  done: 'done',
  todayDone: 'today:done',
  todayInProgress: 'today:in-progress',
  triageDoDateAfterDeadline: 'triage:do-date-after-deadline',
  triageDueDatePast: 'triage:due-date-past',
  triageInbox: 'triage:inbox',
  triagePastDoDate: 'triage:past-do-date',
} as const

export function getDateTaskListKey(date: string) {
  return `date:${date}`
}

export function getUpcomingTaskListKey(
  date: string,
  upcomingDateMode: UpcomingDateMode,
) {
  return upcomingDateMode === 'doDate'
    ? getDateTaskListKey(date)
    : `due-date:${date}`
}

export type TaskBoard = {
  archivedTasks: Task[]
  backlogTasks: Task[]
  doneTasks: Task[]
  todayTasks: {
    done: Task[]
    inProgress: Task[]
    scheduled: Task[]
  }
  triageTasks: {
    doDateAfterDeadline: Task[]
    dueDatePast: Task[]
    inbox: Task[]
    pastDoDate: Task[]
  }
  upcomingDays: {
    date: string
    listKey: string
    tasks: Task[]
  }[]
}

export function buildTaskBoard(
  tasks: Task[],
  todayKey: string,
  upcomingDateMode: UpcomingDateMode,
): TaskBoard {
  const activeTasks = tasks.filter(isActiveTask)
  const archivedTasks = sortTasksByStatusRecency(tasks.filter(isArchivedTask))
  const completeTasks = tasks.filter(isCompleteTask)
  const triageTasks = {
    doDateAfterDeadline: sortTasksForList(
      activeTasks.filter(hasDoDateAfterDeadline),
      taskListKeys.triageDoDateAfterDeadline,
    ),
    dueDatePast: sortTasksForList(
      activeTasks.filter(
        (task) => task.deadline !== null && task.deadline < todayKey,
      ),
      taskListKeys.triageDueDatePast,
    ),
    inbox: sortTasksForList(
      activeTasks.filter(isInboxTask),
      taskListKeys.triageInbox,
    ),
    pastDoDate: sortTasksForList(
      activeTasks.filter(
        (task) => task.doDate !== null && task.doDate < todayKey,
      ),
      taskListKeys.triagePastDoDate,
    ),
  }
  const todayDateListKey = getDateTaskListKey(todayKey)
  const todayTasks = {
    done: sortTasksByStatusRecency(
      completeTasks.filter((task) => isTaskCompletedOnDate(task, todayKey)),
    ),
    inProgress: sortTasksForList(
      activeTasks.filter((task) => task.status === 'in-progress'),
      taskListKeys.todayInProgress,
    ),
    scheduled: sortTasksForList(
      activeTasks.filter(
        (task) => task.status !== 'in-progress' && task.doDate === todayKey,
      ),
      todayDateListKey,
    ),
  }
  const backlogTasks = sortTasksForList(
    activeTasks.filter((task) => task.status === 'backlog'),
    taskListKeys.backlog,
  )
  const doneTasks = sortTasksByStatusRecency(completeTasks)
  const upcomingDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateOnly(todayKey, index + 1)
    const listKey = getUpcomingTaskListKey(date, upcomingDateMode)

    return {
      date,
      listKey,
      tasks: sortUpcomingTasksForList(
        activeTasks.filter(
          (task) => getTaskUpcomingDate(task, upcomingDateMode) === date,
        ),
        listKey,
        upcomingDateMode,
      ),
    }
  })

  return {
    archivedTasks,
    backlogTasks,
    doneTasks,
    todayTasks,
    triageTasks,
    upcomingDays,
  }
}

function isActiveTask(task: Task) {
  return task.status !== 'archived' && task.status !== 'complete'
}

function isCompleteTask(task: Task) {
  return task.status === 'complete'
}

function isArchivedTask(task: Task) {
  return task.status === 'archived'
}

function isTaskCompletedOnDate(task: Task, date: string) {
  return getDateOnlyValue(task.statusChangedAt) === date
}

function isInboxTask(task: Task) {
  return task.status === 'todo' && task.doDate === null
}

function hasDoDateAfterDeadline(task: Task) {
  return Boolean(task.doDate && task.deadline && task.doDate > task.deadline)
}

function getTaskUpcomingDate(task: Task, upcomingDateMode: UpcomingDateMode) {
  return upcomingDateMode === 'doDate' ? task.doDate : task.deadline
}

function sortTasksForList(
  tasks: Task[],
  listKey: string,
  compareFallback = compareTaskFallback,
) {
  return [...tasks].sort((first, second) => {
    const firstRank = first.listOrders[listKey]
    const secondRank = second.listOrders[listKey]
    const firstHasRank = firstRank !== undefined
    const secondHasRank = secondRank !== undefined

    if (firstHasRank && secondHasRank && firstRank !== secondRank) {
      return firstRank - secondRank
    }

    if (firstHasRank !== secondHasRank) {
      return firstHasRank ? -1 : 1
    }

    return compareFallback(first, second)
  })
}

function sortUpcomingTasksForList(
  tasks: Task[],
  listKey: string,
  upcomingDateMode: UpcomingDateMode,
) {
  return sortTasksForList(tasks, listKey, (first, second) =>
    compareTaskFallbackByDateMode(first, second, upcomingDateMode),
  )
}

function sortTasksByStatusRecency(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    return (
      second.statusChangedAt.getTime() - first.statusChangedAt.getTime() ||
      compareTaskFallback(first, second)
    )
  })
}

function compareTaskFallback(first: Task, second: Task) {
  return (
    compareOptionalDates(first.doDate, second.doDate) ||
    taskPriorityRanks[first.priority] - taskPriorityRanks[second.priority] ||
    compareOptionalDates(first.deadline, second.deadline) ||
    second.createdAt.getTime() - first.createdAt.getTime()
  )
}

function compareTaskFallbackByDateMode(
  first: Task,
  second: Task,
  dateMode: UpcomingDateMode,
) {
  if (dateMode === 'doDate') {
    return compareTaskFallback(first, second)
  }

  return (
    compareOptionalDates(first.deadline, second.deadline) ||
    taskPriorityRanks[first.priority] - taskPriorityRanks[second.priority] ||
    compareOptionalDates(first.doDate, second.doDate) ||
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
