import { useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import {
  Archive,
  CalendarArrowUp,
  CalendarPlus,
  CheckCircle2,
  Circle,
  GripVertical,
  Inbox,
  Loader2,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Task } from '@/lib/data-model'
import { cn } from '@/lib/utils'

import { getTaskDragData, type TaskDragData } from '../task-dnd'
import { useTaskActions } from './task-actions-context'
import { type TaskDateField, TaskDateMetaBadge } from './task-date-meta-badge'
import { taskMetaBadgeClassName } from './task-list-styles'
import { TaskPriorityMetaBadge } from './task-priority-meta-badge'
import { TaskRowActionButton } from './task-row-action-button'

export type TaskListDragOptions = {
  canDropTask: (sourceListKey: string, targetListKey: string) => boolean
  isDragEnabled?: boolean
  isReordering: boolean
  listKey: string
}

export type TaskActionGroup =
  | 'archived'
  | 'backlog'
  | 'done'
  | 'today'
  | 'triage'
  | 'upcoming'

export function TaskList({
  actionGroup,
  canDropTask,
  emptyMessage,
  isDragEnabled = true,
  isReordering,
  listKey,
  tasks,
}: TaskListDragOptions & {
  actionGroup: TaskActionGroup
  emptyMessage: string
  tasks: Task[]
}) {
  const { pendingTaskId } = useTaskActions()
  const { isDropTarget, ref } = useDroppable<TaskDragData>({
    accept: (source) => {
      const data = getTaskDragData(source.data)

      return isDragEnabled && data ? canDropTask(data.listKey, listKey) : false
    },
    collisionPriority: 1,
    data: {
      listKey,
      taskId: '',
    },
    disabled: !isDragEnabled,
    id: listKey,
    type: 'task-list',
  })

  return (
    <div
      className={cn(
        'min-h-14 transition-colors',
        isDragEnabled && isDropTarget && 'bg-card/55',
      )}
      ref={ref}
    >
      {tasks.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {tasks.map((task, index) => (
            <TaskListItem
              actionGroup={actionGroup}
              canDropTask={canDropTask}
              index={index}
              isDragEnabled={isDragEnabled}
              isPending={pendingTaskId === task.id}
              isReordering={isReordering}
              key={`${listKey}:${task.id}`}
              listKey={listKey}
              task={task}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskListItem({
  actionGroup,
  canDropTask,
  index,
  isDragEnabled = true,
  isPending,
  isReordering,
  listKey,
  task,
}: TaskListDragOptions & {
  actionGroup: TaskActionGroup
  index: number
  isPending: boolean
  task: Task
}) {
  const actions = useTaskActions()
  const [openMetaField, setOpenMetaField] = useState<
    TaskDateField | 'priority' | null
  >(null)
  const isComplete = task.status === 'complete'
  const isArchived = task.status === 'archived'
  const isDragDisabled = !isDragEnabled || isPending || isReordering
  const statusButtonLabel = isArchived
    ? `Restore ${task.name}`
    : isComplete
      ? `Reopen ${task.name}`
      : `Complete ${task.name}`
  const { handleRef, isDragSource, isDropTarget, ref } =
    useSortable<TaskDragData>({
      accept: (source) => {
        const data = getTaskDragData(source.data)

        return isDragEnabled && data
          ? canDropTask(data.listKey, listKey)
          : false
      },
      data: {
        listKey,
        taskId: task.id,
      },
      disabled: isDragDisabled,
      group: listKey,
      id: getSortableTaskId(listKey, task.id),
      index,
      type: 'task',
    })

  return (
    <li
      className={cn(
        'task-row group relative grid gap-2.5 px-3 py-2.5 transition hover:bg-card/85 sm:px-4',
        isDragEnabled && isDragSource && 'opacity-55',
        isDragEnabled && isDropTarget && 'bg-card/55',
        isDragEnabled
          ? 'grid-cols-[1.25rem_2rem_minmax(0,1fr)] sm:grid-cols-[1.5rem_2rem_minmax(0,1fr)]'
          : 'grid-cols-[2rem_minmax(0,1fr)]',
      )}
      ref={ref}
    >
      {isDragEnabled ? (
        <button
          aria-label={`Drag ${task.name}`}
          className="grid size-5 cursor-grab place-items-center self-center rounded-sm text-muted-foreground/70 transition hover:bg-secondary/65 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 sm:size-6"
          disabled={isDragDisabled}
          onClick={(event) => {
            event.stopPropagation()
          }}
          ref={handleRef}
          title="Drag task"
          type="button"
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}

      <Button
        aria-label={statusButtonLabel}
        className="size-7 self-center border-border/80 bg-secondary/60 text-muted-foreground hover:border-primary/60 hover:text-primary"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation()
          if (isArchived) {
            actions.onStatusChange(task, 'todo')
            return
          }

          actions.onToggle(task)
        }}
        size="icon"
        type="button"
        variant="outline"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isComplete ? (
          <CheckCircle2 className="size-3.5 text-primary" />
        ) : isArchived ? (
          <Archive className="size-3.5" />
        ) : (
          <Circle className="size-3.5" />
        )}
      </Button>

      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,max-content)] sm:items-start">
        <div className="min-w-0">
          <button
            className="grid w-full min-w-0 gap-1.5 rounded-md text-left focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
            onClick={() => actions.onEditTask(task)}
            type="button"
          >
            <span className="min-w-0">
              <span
                className={cn(
                  'block break-words text-sm leading-5 font-medium text-foreground',
                  isComplete && 'text-muted-foreground line-through',
                  isArchived && 'text-muted-foreground',
                )}
              >
                {task.name}
              </span>
              {task.description ? (
                <span className="mt-0.5 block line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                  {task.description}
                </span>
              ) : null}
            </span>
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {actionGroup === 'done' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Mark not done"
                onClick={() => actions.onToggle(task)}
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Not done</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup === 'archived' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Restore task"
                onClick={() => actions.onStatusChange(task, 'todo')}
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Restore</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup === 'triage' ||
            actionGroup === 'backlog' ||
            actionGroup === 'upcoming' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Do today"
                onClick={() => actions.onDoToday(task)}
              >
                <CalendarPlus className="size-3" />
                <span className="hidden sm:inline">Do today</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup === 'today' && task.status !== 'in-progress' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Move to in progress"
                onClick={() => actions.onStatusChange(task, 'in-progress')}
              >
                <PlayCircle className="size-3" />
                <span className="hidden sm:inline">In progress</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup === 'today' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Do tomorrow"
                onClick={() => actions.onDoTomorrow(task)}
              >
                <CalendarArrowUp className="size-3" />
                <span className="hidden sm:inline">Do tomorrow</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup === 'triage' ||
            actionGroup === 'today' ||
            actionGroup === 'upcoming' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Move to backlog"
                onClick={() => actions.onMoveToBacklog(task)}
              >
                <Inbox className="size-3" />
                <span className="hidden sm:inline">Backlog</span>
              </TaskRowActionButton>
            ) : null}
            {actionGroup !== 'done' && actionGroup !== 'archived' ? (
              <TaskRowActionButton
                disabled={isPending}
                label="Archive task"
                onClick={() => actions.onStatusChange(task, 'archived')}
              >
                <Archive className="size-3" />
                <span className="hidden sm:inline">Archive</span>
              </TaskRowActionButton>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-start gap-1.5 text-[0.7rem] text-muted-foreground sm:max-w-[19rem] sm:justify-end">
          {task.tags.map((tag) => (
            <Badge
              className={cn(taskMetaBadgeClassName, 'border-border/70')}
              key={tag}
              variant="outline"
            >
              <span className="truncate">#{tag}</span>
            </Badge>
          ))}
          <TaskDateMetaBadge
            disabled={isPending}
            field="doDate"
            isOpen={openMetaField === 'doDate'}
            onOpenChange={(isOpen) =>
              setOpenMetaField(isOpen ? 'doDate' : null)
            }
            onSelect={(value) => actions.onDateChange(task, 'doDate', value)}
            value={task.doDate}
          />
          <TaskDateMetaBadge
            disabled={isPending}
            field="deadline"
            isOpen={openMetaField === 'deadline'}
            onOpenChange={(isOpen) =>
              setOpenMetaField(isOpen ? 'deadline' : null)
            }
            onSelect={(value) => actions.onDateChange(task, 'deadline', value)}
            value={task.deadline}
          />
          <TaskPriorityMetaBadge
            disabled={isPending}
            isOpen={openMetaField === 'priority'}
            onOpenChange={(isOpen) =>
              setOpenMetaField(isOpen ? 'priority' : null)
            }
            onSelect={(priority) => actions.onPriorityChange(task, priority)}
            value={task.priority}
          />
        </div>
      </div>
    </li>
  )
}

function getSortableTaskId(listKey: string, taskId: string) {
  return `task:${listKey}:${taskId}`
}
