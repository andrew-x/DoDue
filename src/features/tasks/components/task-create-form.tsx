import { Loader2, Plus } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  parseTaskInput,
  removeTaskInputTag,
} from '@/features/tasks/task-input-parser'
import { useCreateTask } from '@/features/tasks/task-queries'
import { UnifiedTaskInput } from '@/features/tasks/unified-task-input'
import { type TaskPriority, taskFieldLimits } from '@/lib/data-model'
import { getErrorMessage } from '@/lib/errors'
import { getTagKey, getUniqueTags, mergeTags } from '@/lib/tags'

import { useTagDraft } from '../use-tag-draft'
import {
  TaskDoDateField,
  TaskDueDateField,
  TaskPriorityField,
  TaskTagsField,
  taskEditorFieldClassName,
} from './task-form-fields'

export function TaskCreateForm({
  rememberedTags = [],
  userId,
}: {
  rememberedTags?: string[]
  userId: string | undefined
}) {
  const createTask = useCreateTask(userId)
  const [title, setTitle] = useState('')
  const [titleFocusRequestKey, setTitleFocusRequestKey] = useState<
    number | null
  >(null)
  const [titleResetKey, setTitleResetKey] = useState(0)
  const [priority, setPriority] = useState<TaskPriority>('p3')
  const [doDate, setDoDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const tagDraft = useTagDraft()
  const [formError, setFormError] = useState<string | null>(null)
  const parsedTitle = useMemo(() => parseTaskInput(title), [title])
  const parsedTagKeys = useMemo(
    () => new Set(parsedTitle.tags.map(getTagKey)),
    [parsedTitle.tags],
  )
  const effectivePriority = parsedTitle.priority ?? priority
  const effectiveDoDate = parsedTitle.doDate ?? doDate
  const effectiveDueDate = parsedTitle.dueDate ?? dueDate
  const effectiveTags = useMemo(
    () => getUniqueTags([...parsedTitle.tags, ...tagDraft.tags]),
    [parsedTitle.tags, tagDraft.tags],
  )
  const hasTitleContent = title.trim().length > 0

  function handleRemoveTag(tag: string) {
    const tagKey = getTagKey(tag)

    if (parsedTagKeys.has(tagKey)) {
      const nextTitle = removeTaskInputTag(title, tag)

      if (nextTitle !== title) {
        setTitle(nextTitle)
        setTitleResetKey((currentKey) => currentKey + 1)
      }
    }

    tagDraft.setTags((currentTags) =>
      currentTags.filter((currentTag) => getTagKey(currentTag) !== tagKey),
    )
  }

  function handleTagDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key !== 'Backspace' ||
      tagDraft.draft ||
      effectiveTags.length === 0
    ) {
      return
    }

    event.preventDefault()
    handleRemoveTag(effectiveTags[effectiveTags.length - 1] ?? '')
  }

  async function submitTaskForm() {
    if (createTask.isPending) {
      return
    }

    const name = parsedTitle.name
    const parsedTags = getUniqueTags([
      ...parsedTitle.tags,
      ...mergeTags(tagDraft.tags, tagDraft.draft),
    ])

    if (!name) {
      setFormError('Title is required.')
      return
    }

    if (parsedTags.length > taskFieldLimits.tagsMaxCount) {
      setFormError(`Use ${taskFieldLimits.tagsMaxCount} tags or fewer.`)
      return
    }

    try {
      setFormError(null)
      await createTask.mutateAsync({
        deadline: effectiveDueDate || null,
        description: '',
        doDate: effectiveDoDate || null,
        name,
        priority: effectivePriority,
        tags: parsedTags,
      })
      resetForm()
      setTitleFocusRequestKey((currentKey) => (currentKey ?? 0) + 1)
    } catch (error) {
      setFormError(getErrorMessage(error, 'Could not create task.'))
    }
  }

  function resetForm() {
    setTitle('')
    setTitleResetKey((currentKey) => currentKey + 1)
    setPriority('p3')
    setDoDate('')
    setDueDate('')
    tagDraft.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitTaskForm()
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-4 sm:p-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="task-input-section grid gap-1.5">
            <span className="task-input-section-label text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              New Task
            </span>
            <UnifiedTaskInput
              className={taskEditorFieldClassName}
              focusRequestKey={titleFocusRequestKey}
              initialValue={title}
              key={titleResetKey}
              rememberedTags={rememberedTags}
              onChange={setTitle}
              onFocusRequestComplete={() => setTitleFocusRequestKey(null)}
              onSubmit={() => void submitTaskForm()}
            />
          </div>

          {hasTitleContent ? (
            <div className="grid gap-2.5 lg:grid-cols-[15rem_10.5rem_10.5rem_minmax(0,1fr)_auto]">
              <TaskPriorityField
                onChange={setPriority}
                value={effectivePriority}
              />
              <TaskDoDateField
                label="Do"
                onChange={setDoDate}
                value={effectiveDoDate}
              />
              <TaskDueDateField
                label="Due"
                onChange={setDueDate}
                value={effectiveDueDate}
              />
              <TaskTagsField
                draft={tagDraft.draft}
                rememberedTags={rememberedTags}
                onAddTag={tagDraft.addTag}
                onDraftBlur={tagDraft.handleDraftBlur}
                onDraftChange={tagDraft.handleDraftChange}
                onDraftKeyDown={handleTagDraftKeyDown}
                onRemoveTag={handleRemoveTag}
                tags={effectiveTags}
              />

              <div className="grid content-end">
                <Button
                  className="h-8 px-3 text-xs"
                  disabled={createTask.isPending || !userId}
                  size="sm"
                  type="submit"
                >
                  {createTask.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Submit
                </Button>
              </div>
            </div>
          ) : null}

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
