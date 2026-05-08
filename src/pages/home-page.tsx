import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppHeader } from '@/components/app/app-header'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-provider'
import {
  useUpdateUserProfileTags,
  useUserProfile,
} from '@/features/profile/profile-queries'
import { TagSettingsDialog } from '@/features/profile/tag-settings-dialog'
import { TaskBoard } from '@/features/tasks/components/task-board'
import { TaskCreateForm } from '@/features/tasks/components/task-create-form'
import { TaskEditDialog } from '@/features/tasks/components/task-edit-dialog'
import {
  buildTaskBoard,
  type UpcomingDateMode,
} from '@/features/tasks/task-board-model'
import {
  addDaysToDateOnly,
  getDateOnlyValue,
} from '@/features/tasks/task-dates'
import {
  type ReorderTasksInput,
  useReorderTasks,
  useTasks,
  useUpdateTask,
} from '@/features/tasks/task-queries'
import type {
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '@/lib/data-model'
import { getErrorMessage } from '@/lib/errors'

export function HomePage() {
  const auth = useAuth()
  const userId = auth.user?.uid
  const profileQuery = useUserProfile(userId)
  const tasksQuery = useTasks(userId)
  const reorderTasks = useReorderTasks(userId)
  const updateTask = useUpdateTask(userId)
  const updateProfileTags = useUpdateUserProfileTags(userId)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [upcomingDateMode, setUpcomingDateMode] =
    useState<UpcomingDateMode>('doDate')
  const [isTagSettingsOpen, setIsTagSettingsOpen] = useState(false)

  const tasks = tasksQuery.data ?? []
  const rememberedTags = profileQuery.data?.tags ?? []
  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) ?? null,
    [editingTaskId, tasks],
  )
  const todayKey = getDateOnlyValue(new Date())
  const tomorrowKey = addDaysToDateOnly(todayKey, 1)
  const taskBoard = useMemo(
    () => buildTaskBoard(tasks, todayKey, upcomingDateMode),
    [tasks, todayKey, upcomingDateMode],
  )

  async function applyTaskUpdate(task: Task, taskUpdate: UpdateTaskInput) {
    try {
      setTaskError(null)
      setPendingTaskId(task.id)
      await updateTask.mutateAsync({
        task: taskUpdate,
        taskId: task.id,
      })
      return true
    } catch (error) {
      setTaskError(getErrorMessage(error, 'Could not update task.'))
      return false
    } finally {
      setPendingTaskId(null)
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    if (task.status === status) {
      return
    }

    await applyTaskUpdate(task, { status })
  }

  async function moveTaskToDoDate(task: Task, doDate: string) {
    if (task.status === 'todo' && task.doDate === doDate) {
      return
    }

    await applyTaskUpdate(task, {
      doDate,
      status: 'todo',
    })
  }

  async function moveTaskToBacklog(task: Task) {
    if (
      task.status === 'backlog' &&
      task.doDate === null &&
      task.deadline === null
    ) {
      return
    }

    await applyTaskUpdate(task, {
      deadline: null,
      doDate: null,
      status: 'backlog',
    })
  }

  async function updateTaskDate(
    task: Task,
    field: 'deadline' | 'doDate',
    value: string | null,
  ) {
    const normalizedValue = value || null
    const currentValue = field === 'doDate' ? task.doDate : task.deadline
    const shouldMoveBacklogTaskToTodo =
      field === 'doDate' &&
      normalizedValue !== null &&
      task.status === 'backlog'

    if (currentValue === normalizedValue && !shouldMoveBacklogTaskToTodo) {
      return
    }

    await applyTaskUpdate(
      task,
      field === 'doDate'
        ? {
            doDate: normalizedValue,
            ...(shouldMoveBacklogTaskToTodo ? { status: 'todo' } : {}),
          }
        : { deadline: normalizedValue },
    )
  }

  async function updateTaskPriority(task: Task, priority: TaskPriority) {
    if (task.priority === priority) {
      return
    }

    await applyTaskUpdate(task, { priority })
  }

  async function handleToggleTask(task: Task) {
    await updateTaskStatus(
      task,
      task.status === 'complete' ? 'todo' : 'complete',
    )
  }

  async function updateTaskDetails(task: Task, taskUpdate: UpdateTaskInput) {
    const didUpdate = await applyTaskUpdate(task, taskUpdate)

    if (didUpdate) {
      setEditingTaskId(null)
    }

    return didUpdate
  }

  async function reorderTaskLists(input: ReorderTasksInput) {
    try {
      setTaskError(null)
      await reorderTasks.mutateAsync(input)
    } catch (error) {
      setTaskError(getErrorMessage(error, 'Could not reorder tasks.'))
    }
  }

  async function saveRememberedTags(tags: string[]) {
    await updateProfileTags.mutateAsync(tags)
  }

  return (
    <main className="app-chrome min-h-svh px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-6xl flex-col">
        <AppHeader
          displayName={auth.user?.displayName}
          onOpenSettings={() => setIsTagSettingsOpen(true)}
          onSignOut={() => {
            void auth.signOut()
          }}
        />

        <TaskCreateForm rememberedTags={rememberedTags} userId={userId} />

        <div className="mt-6 flex-1">
          {taskError ? (
            <Card
              className="mb-4 border-border/70 bg-background/72 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {taskError}
            </Card>
          ) : null}

          {tasksQuery.isLoading ? (
            <Card className="grid min-h-48 place-items-center border-border/70 bg-background/35 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </Card>
          ) : tasksQuery.isError ? (
            <Card className="border-border/70 bg-background/72 px-4 py-8 text-sm text-destructive">
              {getErrorMessage(tasksQuery.error, 'Could not load tasks.')}
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="border-border/70 bg-background/35 px-4 py-8 text-sm text-muted-foreground">
              No tasks yet.
            </Card>
          ) : (
            <TaskBoard
              actions={{
                onDateChange: (task, field, value) =>
                  void updateTaskDate(task, field, value),
                onDoToday: (task) => void moveTaskToDoDate(task, todayKey),
                onDoTomorrow: (task) =>
                  void moveTaskToDoDate(task, tomorrowKey),
                onEditTask: (task) => setEditingTaskId(task.id),
                onMoveToBacklog: (task) => void moveTaskToBacklog(task),
                onPriorityChange: (task, priority) =>
                  void updateTaskPriority(task, priority),
                onStatusChange: (task, status) =>
                  void updateTaskStatus(task, status),
                onToggle: (task) => void handleToggleTask(task),
                pendingTaskId,
              }}
              isReordering={reorderTasks.isPending}
              onReorderTasks={(input) => void reorderTaskLists(input)}
              onUpcomingDateModeChange={setUpcomingDateMode}
              taskBoard={taskBoard}
              todayKey={todayKey}
              upcomingDateMode={upcomingDateMode}
            />
          )}
        </div>
      </div>

      {editingTask ? (
        <TaskEditDialog
          isPending={pendingTaskId === editingTask.id}
          key={editingTask.id}
          onClose={() => setEditingTaskId(null)}
          onSave={(taskUpdate) => updateTaskDetails(editingTask, taskUpdate)}
          rememberedTags={rememberedTags}
          task={editingTask}
        />
      ) : null}

      <TagSettingsDialog
        isLoading={profileQuery.isLoading}
        isPending={updateProfileTags.isPending}
        onClose={() => setIsTagSettingsOpen(false)}
        onSave={saveRememberedTags}
        open={isTagSettingsOpen}
        tags={rememberedTags}
      />
    </main>
  )
}
