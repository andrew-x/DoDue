import type { TaskPriority } from '@/lib/data-model'
import { cn } from '@/lib/utils'

export const taskPriorityLabels = {
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
  p4: 'P4',
} satisfies Record<TaskPriority, string>

export const taskPriorityClassNames = {
  p1: 'task-priority--p1',
  p2: 'task-priority--p2',
  p3: 'task-priority--p3',
  p4: 'task-priority--p4',
} satisfies Record<TaskPriority, string>

export function getTaskPriorityClassName(priority: TaskPriority) {
  return cn('task-priority', taskPriorityClassNames[priority])
}

export function isTaskPriority(value: string): value is TaskPriority {
  return value in taskPriorityClassNames
}
