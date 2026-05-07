import { createContext, type ReactNode, useContext } from 'react'

import type { DateOnlyString, Task, TaskStatus } from '@/lib/data-model'

import type { TaskDateField } from './task-date-meta-badge'

export type TaskActions = {
  onDateChange: (
    task: Task,
    field: TaskDateField,
    value: DateOnlyString | null,
  ) => void
  onDoToday: (task: Task) => void
  onDoTomorrow: (task: Task) => void
  onEditTask: (task: Task) => void
  onMoveToBacklog: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
  onToggle: (task: Task) => void
  pendingTaskId: string | null
}

const TaskActionsContext = createContext<TaskActions | null>(null)

export function TaskActionsProvider({
  children,
  value,
}: {
  children: ReactNode
  value: TaskActions
}) {
  return (
    <TaskActionsContext.Provider value={value}>
      {children}
    </TaskActionsContext.Provider>
  )
}

export function useTaskActions() {
  const context = useContext(TaskActionsContext)

  if (!context) {
    throw new Error('useTaskActions must be used inside TaskActionsProvider')
  }

  return context
}
