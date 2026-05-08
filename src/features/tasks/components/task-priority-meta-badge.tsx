import { Check, Flag } from 'lucide-react'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type TaskPriority, taskPriorities } from '@/lib/data-model'
import { cn } from '@/lib/utils'

import { getTaskPriorityClassName, taskPriorityLabels } from '../task-priority'
import { taskMetaBadgeClassName } from './task-list-styles'

const taskPriorityMetaBadgeClassName =
  'cursor-pointer hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'

export function TaskPriorityMetaBadge({
  disabled,
  isOpen,
  onOpenChange,
  onSelect,
  value,
}: {
  disabled: boolean
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSelect: (priority: TaskPriority) => void
  value: TaskPriority
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const label = taskPriorityLabels[value]

  return (
    <span className="inline-flex max-w-full">
      <Badge
        asChild
        className={cn(
          taskMetaBadgeClassName,
          taskPriorityMetaBadgeClassName,
          'task-priority-chip',
          getTaskPriorityClassName(value),
        )}
        variant="outline"
      >
        <button
          aria-controls={isOpen ? popoverId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Change priority from ${label}`}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            onOpenChange(!isOpen)
          }}
          ref={buttonRef}
          type="button"
        >
          <Flag className="size-3 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </Badge>

      {isOpen ? (
        <TaskPriorityPopover
          anchorRef={buttonRef}
          currentValue={value}
          id={popoverId}
          onClose={() => onOpenChange(false)}
          onSelect={onSelect}
        />
      ) : null}
    </span>
  )
}

function TaskPriorityPopover({
  anchorRef,
  currentValue,
  id,
  onClose,
  onSelect,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>
  currentValue: TaskPriority
  id: string
  onClose: () => void
  onSelect: (priority: TaskPriority) => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({
    left: -9999,
    top: -9999,
    width: taskPriorityPopoverWidth,
  })

  useEffect(() => {
    function updatePosition() {
      const anchor = anchorRef.current

      if (!anchor) {
        return
      }

      const rect = anchor.getBoundingClientRect()
      const width = Math.min(
        taskPriorityPopoverWidth,
        window.innerWidth - taskPriorityPopoverGutter * 2,
      )
      const left = clampNumber(
        rect.left,
        taskPriorityPopoverGutter,
        window.innerWidth - width - taskPriorityPopoverGutter,
      )
      const shouldOpenAbove =
        rect.bottom +
          taskPriorityPopoverGap +
          taskPriorityPopoverEstimatedHeight >
        window.innerHeight - taskPriorityPopoverGutter
      const top = shouldOpenAbove
        ? Math.max(
            taskPriorityPopoverGutter,
            rect.top -
              taskPriorityPopoverGap -
              taskPriorityPopoverEstimatedHeight,
          )
        : rect.bottom + taskPriorityPopoverGap

      setPosition({ left, top, width })
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

  function commitPriority(priority: TaskPriority) {
    if (priority !== currentValue) {
      onSelect(priority)
    }

    onClose()
  }

  return createPortal(
    <div
      aria-label="Set priority"
      className="fixed z-50 grid gap-2 rounded-md border border-border/80 bg-card p-2 text-card-foreground shadow-xl shadow-black/20 ring-1 ring-foreground/5 dark:border-white/10 dark:shadow-black/40"
      id={id}
      ref={popoverRef}
      role="dialog"
      style={position}
    >
      <div className="px-1 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Priority
      </div>
      <div className="grid gap-1">
        {taskPriorities.map((priority) => {
          const isSelected = priority === currentValue

          return (
            <Button
              aria-pressed={isSelected}
              autoFocus={isSelected}
              className={cn(
                'task-priority-option h-8 justify-start gap-1.5 rounded-md border border-transparent px-2 text-xs font-semibold',
                getTaskPriorityClassName(priority),
              )}
              key={priority}
              onClick={() => commitPriority(priority)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Flag className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 text-left">
                {taskPriorityLabels[priority]}
              </span>
              {isSelected ? <Check className="size-3 shrink-0" /> : null}
            </Button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}

const taskPriorityPopoverGap = 6
const taskPriorityPopoverGutter = 8
const taskPriorityPopoverWidth = 176
const taskPriorityPopoverEstimatedHeight = 180

function clampNumber(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}
