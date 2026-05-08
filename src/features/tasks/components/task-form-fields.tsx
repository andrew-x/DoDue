import {
  CalendarCheck,
  CalendarDays,
  Flag,
  type LucideIcon,
  Tag,
  X,
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type TaskPriority, taskPriorities } from '@/lib/data-model'
import { getTagKey, getTagSuggestions } from '@/lib/tags'
import { cn } from '@/lib/utils'

import { getTaskPriorityClassName, taskPriorityLabels } from '../task-priority'

export const taskEditorFieldClassName =
  'min-w-0 w-full rounded-md border border-input bg-background/72 px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35'

const priorityOptionClassName =
  'task-priority-option h-full gap-1 rounded-sm border border-transparent px-1.5 text-[0.7rem] font-semibold'

export function TaskPriorityField({
  className,
  legend = 'Priority',
  onChange,
  value,
}: {
  className?: string
  legend?: string
  onChange: (priority: TaskPriority) => void
  value: TaskPriority
}) {
  return (
    <fieldset className={cn('grid min-w-0', className)}>
      <legend className="mb-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {legend}
      </legend>
      <div className="grid h-8 grid-cols-4 overflow-hidden rounded-md border border-input bg-background/72 p-0.5 shadow-xs">
        {taskPriorities.map((priority) => (
          <Button
            aria-pressed={value === priority}
            className={cn(
              priorityOptionClassName,
              getTaskPriorityClassName(priority),
            )}
            key={priority}
            onClick={() => onChange(priority)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag className="size-3" />
            {taskPriorityLabels[priority]}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}

export function TaskDateField({
  className,
  hideIcon = false,
  icon: Icon,
  label,
  onChange,
  value,
}: {
  className?: string
  hideIcon?: boolean
  icon: LucideIcon
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Label className={className}>
      <span>{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <div className="relative min-w-0 flex-1">
          {hideIcon ? null : (
            <Icon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
          )}
          <Input
            className={cn('h-8 min-w-0 px-2 py-1 text-xs', !hideIcon && 'pl-8')}
            onChange={(event) => onChange(event.target.value)}
            type="date"
            value={value}
          />
        </div>
        {value ? (
          <Button
            aria-label={`Clear ${label.toLocaleLowerCase()}`}
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onChange('')}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </Label>
  )
}

export function TaskDoDateField(
  props: Omit<Parameters<typeof TaskDateField>[0], 'icon'>,
) {
  return <TaskDateField icon={CalendarCheck} {...props} />
}

export function TaskDueDateField(
  props: Omit<Parameters<typeof TaskDateField>[0], 'icon'>,
) {
  return <TaskDateField icon={CalendarDays} {...props} />
}

export function TaskTagsField({
  className,
  draft,
  onDraftBlur,
  onDraftChange,
  onDraftKeyDown,
  onAddTag,
  onRemoveTag,
  readOnlyTagKeys = new Set<string>(),
  rememberedTags = [],
  suggestionsSide = 'bottom',
  tags,
}: {
  className?: string
  draft: string
  rememberedTags?: string[]
  onDraftBlur: () => void
  onDraftChange: (value: string) => void
  onDraftKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  readOnlyTagKeys?: Set<string>
  tags: string[]
  suggestionsSide?: 'bottom' | 'top'
}) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const excludedTagKeys = useMemo(() => {
    const keys = new Set(readOnlyTagKeys)

    for (const tag of tags) {
      keys.add(getTagKey(tag))
    }

    return keys
  }, [readOnlyTagKeys, tags])
  const tagSuggestions = useMemo(
    () =>
      getTagSuggestions({
        draft,
        excludedTagKeys,
        rememberedTags,
      }),
    [draft, excludedTagKeys, rememberedTags],
  )
  const visibleSuggestions = isSuggestionsOpen ? tagSuggestions : []

  useEffect(() => {
    if (activeSuggestionIndex < tagSuggestions.length) {
      return
    }

    setActiveSuggestionIndex(Math.max(0, tagSuggestions.length - 1))
  }, [activeSuggestionIndex, tagSuggestions.length])

  function commitTagSuggestion(tag: string) {
    onAddTag(tag)
    setActiveSuggestionIndex(0)
    setIsSuggestionsOpen(false)
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (visibleSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveSuggestionIndex((index) =>
          index >= visibleSuggestions.length - 1 ? 0 : index + 1,
        )
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveSuggestionIndex((index) =>
          index <= 0 ? visibleSuggestions.length - 1 : index - 1,
        )
        return
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        commitTagSuggestion(visibleSuggestions[activeSuggestionIndex] ?? '')
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setIsSuggestionsOpen(false)
        return
      }
    }

    onDraftKeyDown(event)
  }

  return (
    <Label className={className}>
      <span>Tags</span>
      <div
        className={cn(
          'relative flex min-h-8 items-center rounded-md border border-input bg-background/72 px-1.5 py-1 pl-8 text-xs tracking-normal text-foreground normal-case shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/35',
        )}
      >
        <Tag className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {tags.map((tag) => {
            const isReadOnly = readOnlyTagKeys.has(tag.toLocaleLowerCase())

            return (
              <Badge
                className="max-w-full gap-1 rounded-sm border-primary/35 bg-primary/12 px-1 py-0 text-[0.7rem] text-foreground"
                key={tag}
                variant="outline"
              >
                <span className="min-w-0 truncate">#{tag}</span>
                {isReadOnly ? null : (
                  <Button
                    aria-label={`Remove ${tag} tag`}
                    className="size-3.5 rounded-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                    onClick={() => onRemoveTag(tag)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-2.5" />
                  </Button>
                )}
              </Badge>
            )
          })}
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className="min-w-16 flex-1 bg-transparent py-0 text-xs text-foreground outline-none placeholder:text-muted-foreground"
            onBlur={() => {
              setIsSuggestionsOpen(false)
              onDraftBlur()
            }}
            onChange={(event) => {
              setIsSuggestionsOpen(true)
              setActiveSuggestionIndex(0)
              onDraftChange(event.target.value)
            }}
            onFocus={() => setIsSuggestionsOpen(true)}
            onKeyDown={handleDraftKeyDown}
            placeholder={tags.length === 0 ? 'design, billing' : 'Add tag'}
            spellCheck={false}
            value={draft}
          />
        </div>
        {visibleSuggestions.length > 0 ? (
          <div
            className={cn(
              'absolute right-0 left-0 z-30 max-h-52 overflow-y-auto rounded-md border border-border/80 bg-popover py-1 text-popover-foreground shadow-xl',
              suggestionsSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {visibleSuggestions.map((suggestion, index) => (
              <button
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-secondary/70',
                  index === activeSuggestionIndex && 'bg-secondary/70',
                )}
                key={suggestion}
                onMouseDown={(event) => {
                  event.preventDefault()
                  commitTagSuggestion(suggestion)
                }}
                type="button"
              >
                #{suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Label>
  )
}
