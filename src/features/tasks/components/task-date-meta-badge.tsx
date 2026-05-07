import { CalendarCheck, CalendarDays, X } from 'lucide-react'
import {
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DateOnlyString } from '@/lib/data-model'
import { cn } from '@/lib/utils'

import {
  addDaysToDateOnly,
  formatDateOnly,
  formatWeekdayDate,
  getDateOnlyValue,
  getEndOfWeekDateOnly,
  getNextWeekDateOnly,
} from '../task-dates'
import { taskMetaBadgeClassName } from './task-list-styles'

export type TaskDateField = 'deadline' | 'doDate'

const taskMetaDateBadgeClassName =
  'cursor-pointer border border-transparent hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
const emptyTaskMetaDateBadgeClassName =
  'border-dashed border-border/70 bg-secondary/35 text-muted-foreground/80'
const dueDateTodayBadgeClassName =
  'border-destructive/50 bg-destructive/12 text-destructive ring-1 ring-destructive/25 hover:bg-destructive/18 hover:text-destructive dark:border-destructive/55 dark:bg-destructive/18 dark:ring-destructive/35'

export function TaskDateMetaBadge({
  disabled,
  field,
  isOpen,
  onOpenChange,
  onSelect,
  value,
}: {
  disabled: boolean
  field: TaskDateField
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSelect: (value: DateOnlyString | null) => void
  value: DateOnlyString | null
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const label = getTaskDateFieldLabel(field)
  const formattedDate = formatDateOnly(value)
  const Icon = field === 'doDate' ? CalendarCheck : CalendarDays
  const isDueToday =
    field === 'deadline' && value === getDateOnlyValue(new Date())
  const displayText = getTaskDateChipText({
    field,
    formattedDate,
    isDueToday,
  })

  return (
    <span className="inline-flex max-w-full">
      <Badge
        asChild
        className={cn(
          taskMetaBadgeClassName,
          taskMetaDateBadgeClassName,
          !formattedDate && emptyTaskMetaDateBadgeClassName,
          isDueToday && dueDateTodayBadgeClassName,
        )}
        variant="secondary"
      >
        <button
          aria-controls={isOpen ? popoverId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={
            displayText
              ? `Change ${label.toLocaleLowerCase()} from ${displayText.toLocaleLowerCase()}`
              : `Set ${label.toLocaleLowerCase()}`
          }
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            onOpenChange(!isOpen)
          }}
          ref={buttonRef}
          type="button"
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{displayText ?? label}</span>
        </button>
      </Badge>

      {isOpen ? (
        <TaskDatePopover
          anchorRef={buttonRef}
          currentValue={value}
          field={field}
          id={popoverId}
          onClose={() => onOpenChange(false)}
          onSelect={onSelect}
        />
      ) : null}
    </span>
  )
}

function getTaskDateChipText({
  field,
  formattedDate,
  isDueToday,
}: {
  field: TaskDateField
  formattedDate: string | null
  isDueToday: boolean
}) {
  if (!formattedDate) {
    return null
  }

  if (isDueToday) {
    return 'Due today'
  }

  return `${getTaskDateChipPrefix(field)} ${formattedDate}`
}

function TaskDatePopover({
  anchorRef,
  currentValue,
  field,
  id,
  onClose,
  onSelect,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>
  currentValue: DateOnlyString | null
  field: TaskDateField
  id: string
  onClose: () => void
  onSelect: (value: DateOnlyString | null) => void
}) {
  const inputId = useId()
  const popoverRef = useRef<HTMLDivElement>(null)
  const label = getTaskDateFieldLabel(field)
  const Icon = field === 'doDate' ? CalendarCheck : CalendarDays
  const todayKey = useMemo(() => getDateOnlyValue(new Date()), [])
  const shortcutOptions = useMemo(
    () => getTaskDateShortcutOptions(todayKey),
    [todayKey],
  )
  const [position, setPosition] = useState({ left: -9999, top: -9999 })

  useEffect(() => {
    function updatePosition() {
      const anchor = anchorRef.current

      if (!anchor) {
        return
      }

      const rect = anchor.getBoundingClientRect()
      const width = Math.min(
        taskDatePopoverWidth,
        window.innerWidth - taskDatePopoverGutter * 2,
      )
      const left = clampNumber(
        rect.left,
        taskDatePopoverGutter,
        window.innerWidth - width - taskDatePopoverGutter,
      )
      const shouldOpenAbove =
        rect.bottom + taskDatePopoverGap + taskDatePopoverEstimatedHeight >
        window.innerHeight - taskDatePopoverGutter
      const top = shouldOpenAbove
        ? Math.max(
            taskDatePopoverGutter,
            rect.top - taskDatePopoverGap - taskDatePopoverEstimatedHeight,
          )
        : rect.bottom + taskDatePopoverGap

      setPosition({ left, top })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (
        popoverRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return
      }

      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [anchorRef, onClose])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      onClose()
      anchorRef.current?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, onClose])

  function commitDate(value: DateOnlyString | null) {
    onSelect(value)
    onClose()
  }

  return createPortal(
    <div
      aria-label={`Set ${label.toLocaleLowerCase()}`}
      className="fixed z-50 grid w-[17rem] max-w-[calc(100vw-1rem)] gap-3 rounded-md border border-border/80 bg-card p-3 text-card-foreground shadow-xl shadow-black/20 ring-1 ring-foreground/5 dark:border-white/10 dark:shadow-black/40"
      id={id}
      ref={popoverRef}
      role="dialog"
      style={position}
    >
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const value = formData.get('task-date')

          if (typeof value === 'string') {
            commitDate(value || null)
          }
        }}
      >
        <label
          className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          htmlFor={inputId}
        >
          {label}
        </label>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
            <Input
              autoFocus
              className="h-8 min-w-0 px-2 py-1 pr-2 pl-8 text-xs leading-none [color-scheme:light] dark:[color-scheme:dark]"
              defaultValue={currentValue ?? ''}
              id={inputId}
              name="task-date"
              type="date"
            />
          </div>
          <Button className="h-8 px-2.5 text-xs" size="sm" type="submit">
            Apply
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-1.5">
        {shortcutOptions.map((shortcut) => (
          <Button
            className="h-auto justify-start gap-1 rounded-md border border-border/60 bg-background/45 px-2 py-1.5 text-left text-xs text-foreground shadow-none hover:bg-secondary/70 hover:text-foreground dark:bg-background/35"
            key={`${shortcut.label}:${shortcut.value}`}
            onClick={() => commitDate(shortcut.value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <span className="min-w-0">
              <span className="block leading-tight">{shortcut.label}</span>
              <span className="block text-[0.65rem] leading-tight text-muted-foreground">
                {shortcut.caption}
              </span>
            </span>
          </Button>
        ))}
      </div>

      {currentValue ? (
        <Button
          className="h-8 justify-start gap-1 border border-transparent px-2 text-xs text-muted-foreground hover:bg-secondary/65 hover:text-foreground"
          onClick={() => commitDate(null)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="size-3" />
          Clear {label.toLocaleLowerCase()}
        </Button>
      ) : null}
    </div>,
    document.body,
  )
}

const taskDatePopoverGap = 6
const taskDatePopoverGutter = 8
const taskDatePopoverWidth = 272
const taskDatePopoverEstimatedHeight = 236

function getTaskDateShortcutOptions(todayKey: DateOnlyString) {
  return [
    {
      caption: formatWeekdayDate(todayKey),
      label: 'Today',
      value: todayKey,
    },
    {
      caption: formatWeekdayDate(addDaysToDateOnly(todayKey, 1)),
      label: 'Tomorrow',
      value: addDaysToDateOnly(todayKey, 1),
    },
    {
      caption: formatWeekdayDate(getEndOfWeekDateOnly(todayKey)),
      label: 'End of week',
      value: getEndOfWeekDateOnly(todayKey),
    },
    {
      caption: formatWeekdayDate(getNextWeekDateOnly(todayKey)),
      label: 'Next week',
      value: getNextWeekDateOnly(todayKey),
    },
  ] satisfies {
    caption: string
    label: string
    value: DateOnlyString
  }[]
}

function getTaskDateFieldLabel(field: TaskDateField) {
  return field === 'doDate' ? 'Do date' : 'Due date'
}

function getTaskDateChipPrefix(field: TaskDateField) {
  return field === 'doDate' ? 'Do' : 'Due'
}

function clampNumber(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}
