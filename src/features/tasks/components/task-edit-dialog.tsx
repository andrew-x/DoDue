import { Loader2 } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  type Task,
  type TaskPriority,
  taskFieldLimits,
  type UpdateTaskInput,
} from '@/lib/data-model'
import { getUniqueTags, mergeTags } from '@/lib/tags'

import { useTagDraft } from '../use-tag-draft'
import {
  TaskDoDateField,
  TaskDueDateField,
  TaskPriorityField,
  TaskTagsField,
} from './task-form-fields'

export function TaskEditDialog({
  isPending,
  onClose,
  onSave,
  rememberedTags = [],
  task,
}: {
  isPending: boolean
  onClose: () => void
  onSave: (taskUpdate: UpdateTaskInput) => Promise<boolean>
  rememberedTags?: string[]
  task: Task
}) {
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [doDate, setDoDate] = useState(task.doDate ?? '')
  const [dueDate, setDueDate] = useState(task.deadline ?? '')
  const tagDraft = useTagDraft(getUniqueTags(task.tags))
  const [error, setError] = useState<string | null>(null)

  function handleTagDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key !== 'Backspace' ||
      tagDraft.draft ||
      tagDraft.tags.length === 0
    ) {
      return
    }

    event.preventDefault()
    tagDraft.setTags((currentTags) => currentTags.slice(0, -1))
  }

  function handleRemoveTag(tag: string) {
    tagDraft.setTags((currentTags) =>
      currentTags.filter((currentTag) => currentTag !== tag),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isPending) {
      return
    }

    const parsedName = name.trim()
    const parsedDescription = description.trim()
    const parsedTags = mergeTags(tagDraft.tags, tagDraft.draft)

    if (!parsedName) {
      setError('Title is required.')
      return
    }

    if (parsedTags.length > taskFieldLimits.tagsMaxCount) {
      setError(`Use ${taskFieldLimits.tagsMaxCount} tags or fewer.`)
      return
    }

    if (parsedTags.some((tag) => tag.length > taskFieldLimits.tagMaxLength)) {
      setError(
        `Keep each tag under ${taskFieldLimits.tagMaxLength} characters.`,
      )
      return
    }

    if (parsedDescription.length > taskFieldLimits.descriptionMaxLength) {
      setError(
        `Keep the description under ${taskFieldLimits.descriptionMaxLength} characters.`,
      )
      return
    }

    setError(null)
    await onSave({
      deadline: dueDate || null,
      description: parsedDescription,
      doDate: doDate || null,
      name: parsedName,
      priority,
      tags: parsedTags,
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader className="border-border/70 border-b px-4 py-3 pr-12">
            <DialogTitle className="text-base">Edit task</DialogTitle>
          </DialogHeader>

          <div className="grid max-h-[calc(100svh-10rem)] gap-4 overflow-y-auto p-4">
            <Label>
              <span>Title</span>
              <Input
                aria-invalid={Boolean(error && !name.trim())}
                maxLength={taskFieldLimits.nameMaxLength}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Label>

            <Label>
              <span>Description</span>
              <Textarea
                className="min-h-28 resize-y leading-6"
                maxLength={taskFieldLimits.descriptionMaxLength}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </Label>

            <div className="grid gap-3">
              <TaskPriorityField onChange={setPriority} value={priority} />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <TaskDoDateField
                  className="min-w-0"
                  hideIcon
                  label="Do date"
                  onChange={setDoDate}
                  value={doDate}
                />
                <TaskDueDateField
                  className="min-w-0"
                  hideIcon
                  label="Due date"
                  onChange={setDueDate}
                  value={dueDate}
                />
              </div>
            </div>

            <TaskTagsField
              draft={tagDraft.draft}
              rememberedTags={rememberedTags}
              onAddTag={tagDraft.addTag}
              onDraftBlur={tagDraft.handleDraftBlur}
              onDraftChange={tagDraft.handleDraftChange}
              onDraftKeyDown={handleTagDraftKeyDown}
              onRemoveTag={handleRemoveTag}
              suggestionsSide="top"
              tags={tagDraft.tags}
            />

            {error ? (
              <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-border/70 border-t px-4 py-3">
            <Button
              disabled={isPending}
              onClick={onClose}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
