import { DragDropProvider } from '@dnd-kit/react'
import {
  AlertTriangle,
  Archive,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Inbox,
  ListChecks,
  type LucideIcon,
  PlayCircle,
  Search,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Task } from '@/lib/data-model'
import { cn } from '@/lib/utils'

import {
  canDropTaskBetweenLists,
  getTaskListsByKey,
  handleTaskBoardDragEnd,
  handleTaskBoardDragOver,
} from '../task-board-dnd'
import {
  getDateTaskListKey,
  type TaskBoard as TaskBoardModel,
  taskListKeys,
  type UpcomingDateMode,
} from '../task-board-model'
import { formatWeekdayDate } from '../task-dates'
import type { ReorderTasksInput } from '../task-queries'
import { type TaskActions, TaskActionsProvider } from './task-actions-context'
import {
  type TaskActionGroup,
  TaskList,
  type TaskListDragOptions,
} from './task-list'

const countBadgeClassName =
  'border-border/70 px-2.5 py-1 text-xs font-medium text-muted-foreground'

const upcomingDateModeOptions = [
  {
    icon: CalendarCheck,
    label: 'Do date',
    value: 'doDate',
  },
  {
    icon: CalendarDays,
    label: 'Due date',
    value: 'deadline',
  },
] satisfies {
  icon: LucideIcon
  label: string
  value: UpcomingDateMode
}[]

export function TaskBoard({
  actions,
  isReordering,
  onReorderTasks,
  onUpcomingDateModeChange,
  taskBoard,
  todayKey,
  upcomingDateMode,
}: {
  actions: TaskActions
  isReordering: boolean
  onReorderTasks: (input: ReorderTasksInput) => void
  onUpcomingDateModeChange: (mode: UpcomingDateMode) => void
  taskBoard: TaskBoardModel
  todayKey: string
  upcomingDateMode: UpcomingDateMode
}) {
  const todayDateListKey = getDateTaskListKey(todayKey)
  const taskListsByKey = useMemo(
    () => getTaskListsByKey(taskBoard, todayDateListKey),
    [taskBoard, todayDateListKey],
  )
  const canDropTask = (sourceListKey: string, targetListKey: string) =>
    canDropTaskBetweenLists(sourceListKey, targetListKey, todayDateListKey)
  const triageSections = [
    {
      icon: Inbox,
      listKey: taskListKeys.triageInbox,
      tasks: taskBoard.triageTasks.inbox,
      title: 'Inbox',
    },
    {
      icon: CalendarCheck,
      listKey: taskListKeys.triagePastDoDate,
      tasks: taskBoard.triageTasks.pastDoDate,
      title: 'Do date in the past',
    },
    {
      icon: CalendarDays,
      listKey: taskListKeys.triageDueDatePast,
      tasks: taskBoard.triageTasks.dueDatePast,
      title: 'Due date in the past',
    },
    {
      icon: AlertTriangle,
      listKey: taskListKeys.triageDoDateAfterDeadline,
      tasks: taskBoard.triageTasks.doDateAfterDeadline,
      title: 'Do date after due date',
    },
  ].filter((section) => section.tasks.length > 0)
  const triageCount = triageSections.reduce(
    (count, section) => count + section.tasks.length,
    0,
  )
  const todayCount =
    taskBoard.todayTasks.done.length +
    taskBoard.todayTasks.inProgress.length +
    taskBoard.todayTasks.scheduled.length
  const upcomingCount = taskBoard.upcomingDays.reduce(
    (count, day) => count + day.tasks.length,
    0,
  )

  return (
    <TaskActionsProvider value={actions}>
      <DragDropProvider
        onDragEnd={(event) => {
          handleTaskBoardDragEnd({
            canDropTask,
            event,
            onReorderTasks,
            taskListsByKey,
          })
        }}
        onDragOver={(event) => {
          handleTaskBoardDragOver({ canDropTask, event })
        }}
      >
        <div className="grid gap-4">
          {triageSections.length > 0 ? (
            <Card
              asChild
              className="triage-card shadow-none backdrop-blur-none"
            >
              <section>
                <CardContent className="p-4">
                  <TaskSectionHeader
                    accent="triage"
                    count={formatTaskCount(triageCount)}
                    description="Dates and inbox items that need cleanup before they drift."
                    icon={AlertTriangle}
                    title="Triage"
                  />

                  <div className="triage-inner mt-4 overflow-hidden rounded-md border">
                    {triageSections.map((section) => (
                      <TaskAccordionItem
                        canDropTask={canDropTask}
                        defaultOpen
                        icon={section.icon}
                        isReordering={isReordering}
                        key={section.title}
                        listKey={section.listKey}
                        tasks={section.tasks}
                        title={section.title}
                      />
                    ))}
                  </div>
                </CardContent>
              </section>
            </Card>
          ) : null}

          <Card
            asChild
            className="border-border/70 bg-background/35 shadow-none backdrop-blur-none"
          >
            <section>
              <CardContent className="p-4">
                <TaskSectionHeader
                  count={formatTaskCount(todayCount)}
                  icon={ListChecks}
                  title="Today"
                />

                <div className="mt-5 grid gap-5">
                  <TaskColumn
                    actionGroup="today"
                    canDropTask={canDropTask}
                    emptyMessage="No tasks in progress."
                    icon={PlayCircle}
                    isReordering={isReordering}
                    listKey={taskListKeys.todayInProgress}
                    tasks={taskBoard.todayTasks.inProgress}
                    title="In Progress"
                  />
                  <TaskColumn
                    actionGroup="today"
                    canDropTask={canDropTask}
                    emptyMessage="Nothing to do today."
                    icon={CalendarCheck}
                    isReordering={isReordering}
                    listKey={todayDateListKey}
                    tasks={taskBoard.todayTasks.scheduled}
                    title="For Today"
                  />
                  <TaskColumn
                    actionGroup="done"
                    canDropTask={canDropTask}
                    emptyMessage="No tasks done today."
                    icon={CheckCircle2}
                    isDragEnabled={false}
                    isReordering={isReordering}
                    listKey={taskListKeys.todayDone}
                    tasks={taskBoard.todayTasks.done}
                    title="Done Today"
                  />
                </div>
              </CardContent>
            </section>
          </Card>

          <ExpandableTaskSection
            count={formatTaskCount(upcomingCount)}
            icon={CalendarClock}
            title="Upcoming"
          >
            <div className="border-border/70 border-b bg-secondary/20 px-4 py-3">
              <UpcomingDateModeControl
                onChange={onUpcomingDateModeChange}
                value={upcomingDateMode}
              />
            </div>
            {taskBoard.upcomingDays.map((day) => (
              <UpcomingDay
                date={day.date}
                emptyMessage={
                  upcomingDateMode === 'doDate'
                    ? 'No tasks to do.'
                    : 'No tasks due.'
                }
                canDropTask={canDropTask}
                isReordering={isReordering}
                key={day.listKey}
                listKey={day.listKey}
                tasks={day.tasks}
              />
            ))}
          </ExpandableTaskSection>

          <ExpandableTaskSection
            count={formatTaskCount(taskBoard.backlogTasks.length)}
            icon={Archive}
            title="Backlog"
          >
            <TaskList
              actionGroup="backlog"
              canDropTask={canDropTask}
              emptyMessage="No backlog tasks."
              isReordering={isReordering}
              listKey={taskListKeys.backlog}
              tasks={taskBoard.backlogTasks}
            />
          </ExpandableTaskSection>

          <ExpandableTaskSection
            count={formatTaskCount(taskBoard.doneTasks.length)}
            icon={CheckCircle2}
            title="Done"
          >
            <SearchableStaticTaskList
              actionGroup="done"
              canDropTask={canDropTask}
              emptyMessage="No done tasks."
              emptySearchMessage="No done tasks match that title."
              isReordering={isReordering}
              listKey={taskListKeys.done}
              searchLabel="Search done task titles"
              tasks={taskBoard.doneTasks}
            />
          </ExpandableTaskSection>

          <ExpandableTaskSection
            count={formatTaskCount(taskBoard.archivedTasks.length)}
            icon={Archive}
            title="Archived"
          >
            <SearchableStaticTaskList
              actionGroup="archived"
              canDropTask={canDropTask}
              emptyMessage="No archived tasks."
              emptySearchMessage="No archived tasks match that title."
              isReordering={isReordering}
              listKey={taskListKeys.archived}
              searchLabel="Search archived task titles"
              tasks={taskBoard.archivedTasks}
            />
          </ExpandableTaskSection>
        </div>
      </DragDropProvider>
    </TaskActionsProvider>
  )
}

function SearchableStaticTaskList({
  actionGroup,
  canDropTask,
  emptyMessage,
  emptySearchMessage,
  isReordering,
  listKey,
  searchLabel,
  tasks,
}: {
  actionGroup: TaskActionGroup
  emptyMessage: string
  emptySearchMessage: string
  searchLabel: string
  tasks: Task[]
} & Pick<TaskListDragOptions, 'canDropTask' | 'isReordering' | 'listKey'>) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredTasks = normalizedQuery
    ? tasks.filter((task) =>
        task.name.toLocaleLowerCase().includes(normalizedQuery),
      )
    : tasks

  return (
    <>
      <div className="border-border/70 border-b bg-secondary/20 p-3">
        <div className="relative">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-3.5 text-muted-foreground" />
          <Input
            aria-label={searchLabel}
            className="h-9 pl-9 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles"
            type="search"
            value={query}
          />
        </div>
      </div>
      <TaskList
        actionGroup={actionGroup}
        canDropTask={canDropTask}
        emptyMessage={normalizedQuery ? emptySearchMessage : emptyMessage}
        isDragEnabled={false}
        isReordering={isReordering}
        listKey={listKey}
        tasks={filteredTasks}
      />
    </>
  )
}

function TaskSectionHeader({
  accent,
  count,
  description,
  icon: Icon,
  title,
}: {
  accent?: 'triage'
  count: string
  description?: string
  icon: LucideIcon
  title: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg border text-foreground',
            accent === 'triage'
              ? 'triage-icon'
              : 'border-border/60 bg-secondary/40',
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <Badge
        className={cn(
          countBadgeClassName,
          accent === 'triage' && 'triage-count',
        )}
        variant="outline"
      >
        {count}
      </Badge>
    </div>
  )
}

function TaskAccordionItem({
  canDropTask,
  defaultOpen,
  icon: Icon,
  isReordering,
  listKey,
  tasks,
  title,
}: TaskListDragOptions & {
  defaultOpen?: boolean
  icon: LucideIcon
  tasks: Task[]
  title: string
}) {
  return (
    <details
      className="group border-border/70 border-b last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex list-none items-center gap-3 px-4 py-2.5 transition hover:bg-card/42 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-90" />
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </summary>
      <div className="border-border/70 border-t">
        <TaskList
          actionGroup="triage"
          canDropTask={canDropTask}
          emptyMessage="No tasks."
          isReordering={isReordering}
          listKey={listKey}
          tasks={tasks}
        />
      </div>
    </details>
  )
}

function TaskColumn({
  actionGroup,
  canDropTask,
  emptyMessage,
  icon: Icon,
  isDragEnabled,
  isReordering,
  listKey,
  tasks,
  title,
}: TaskListDragOptions & {
  actionGroup: TaskActionGroup
  emptyMessage: string
  icon: LucideIcon
  tasks: Task[]
  title: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="mt-2 overflow-hidden rounded-md border border-border/70 bg-background/35">
        <TaskList
          actionGroup={actionGroup}
          canDropTask={canDropTask}
          emptyMessage={emptyMessage}
          isDragEnabled={isDragEnabled}
          isReordering={isReordering}
          listKey={listKey}
          tasks={tasks}
        />
      </div>
    </div>
  )
}

function ExpandableTaskSection({
  children,
  count,
  icon: Icon,
  title,
}: {
  children: ReactNode
  count: string
  icon: LucideIcon
  title: string
}) {
  return (
    <Card
      asChild
      className="group border-border/70 bg-background/35 shadow-none backdrop-blur-none"
    >
      <details>
        <summary className="flex list-none items-center gap-3 p-4 transition hover:bg-card/42 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-90" />
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 text-foreground">
            <Icon className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </span>
          </span>
          <Badge className={countBadgeClassName} variant="outline">
            {count}
          </Badge>
        </summary>

        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-md border border-border/70 bg-background/35">
            {children}
          </div>
        </div>
      </details>
    </Card>
  )
}

function UpcomingDateModeControl({
  onChange,
  value,
}: {
  onChange: (mode: UpcomingDateMode) => void
  value: UpcomingDateMode
}) {
  return (
    <fieldset className="inline-flex rounded-md border border-border/70 bg-background/55 p-0.5">
      <legend className="sr-only">Upcoming grouping</legend>
      {upcomingDateModeOptions.map((option) => {
        const Icon = option.icon
        const isSelected = option.value === value

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none',
              isSelected && 'bg-secondary text-foreground shadow-xs',
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <Icon className="size-3.5" />
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}

function UpcomingDay({
  canDropTask,
  date,
  emptyMessage,
  isReordering,
  listKey,
  tasks,
}: TaskListDragOptions & {
  date: string
  emptyMessage: string
  tasks: Task[]
}) {
  return (
    <section className="border-border/70 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-3 bg-secondary/35 px-4 py-2">
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {formatWeekdayDate(date)}
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <TaskList
        actionGroup="upcoming"
        canDropTask={canDropTask}
        emptyMessage={emptyMessage}
        isReordering={isReordering}
        listKey={listKey}
        tasks={tasks}
      />
    </section>
  )
}

function formatTaskCount(count: number) {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`
}
