import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { taskFieldLimits } from '@/lib/data-model'
import { getErrorMessage } from '@/lib/errors'
import { getTagKey, normalizeTag } from '@/lib/tags'

type DraftTag = {
  id: string
  value: string
}

export function TagSettingsDialog({
  isLoading,
  isPending,
  onClose,
  onSave,
  open,
  tags,
}: {
  isLoading: boolean
  isPending: boolean
  onClose: () => void
  onSave: (tags: string[]) => Promise<void>
  open: boolean
  tags: string[]
}) {
  const [draftTags, setDraftTags] = useState(() => createDraftTags(tags))
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setDraftTags(createDraftTags(tags))
    setNewTag('')
    setError(null)
  }, [open, tags])

  function updateDraftTag(id: string, value: string) {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => (tag.id === id ? { ...tag, value } : tag)),
    )
  }

  function removeDraftTag(id: string) {
    setDraftTags((currentTags) => currentTags.filter((tag) => tag.id !== id))
    setError(null)
  }

  function addDraftTag() {
    const tag = normalizeTag(newTag)
    const validation = validateTagInputs([...getDraftTagValues(draftTags), tag])

    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setDraftTags((currentTags) =>
      syncDraftTagValues(currentTags, validation.tags),
    )
    setNewTag('')
    setError(null)
  }

  function handleNewTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    addDraftTag()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isPending) {
      return
    }

    const currentTags = getDraftTagValues(draftTags)
    const validation = validateTagInputs(
      newTag.trim() ? [...currentTags, newTag] : currentTags,
    )

    if (!validation.ok) {
      setError(validation.error)
      return
    }

    try {
      setError(null)
      await onSave(validation.tags)
      onClose()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Could not save remembered tags.'))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-xl overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader className="border-border/70 border-b px-4 py-3 pr-12">
            <DialogTitle className="text-base">Remembered Tags</DialogTitle>
          </DialogHeader>

          <div className="grid max-h-[calc(100svh-10rem)] gap-4 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid min-h-28 place-items-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : draftTags.length === 0 ? (
              <p className="rounded-md border border-border/70 bg-secondary/35 px-3 py-4 text-sm text-muted-foreground">
                No remembered tags yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {draftTags.map((tag, index) => (
                  <div className="grid gap-1" key={tag.id}>
                    <div className="flex min-w-0 items-center gap-2">
                      <Input
                        aria-invalid={Boolean(error)}
                        aria-label={`Tag ${index + 1}`}
                        onChange={(event) =>
                          updateDraftTag(tag.id, event.target.value)
                        }
                        value={tag.value}
                      />
                      <Button
                        aria-label={`Remove ${tag.value || 'tag'}`}
                        className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDraftTag(tag.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex min-w-0 items-center gap-2">
              <Input
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={handleNewTagKeyDown}
                placeholder="Add remembered tag"
                value={newTag}
              />
              <Button
                className="size-10 shrink-0"
                disabled={!newTag.trim()}
                onClick={addDraftTag}
                size="icon"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                <span className="sr-only">Add tag</span>
              </Button>
            </div>

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
            <Button disabled={isPending || isLoading} type="submit">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type TagValidationResult =
  | {
      ok: true
      tags: string[]
    }
  | {
      error: string
      ok: false
    }

function validateTagInputs(tags: string[]): TagValidationResult {
  const normalizedTags = tags.map(normalizeTag)
  const seenTagKeys = new Set<string>()

  for (const tag of normalizedTags) {
    if (!tag) {
      return {
        error: 'Tags cannot be empty.',
        ok: false,
      }
    }

    if (tag.length > taskFieldLimits.tagMaxLength) {
      return {
        error: `Keep each tag under ${taskFieldLimits.tagMaxLength} characters.`,
        ok: false,
      }
    }

    const tagKey = getTagKey(tag)

    if (seenTagKeys.has(tagKey)) {
      return {
        error: `Remove the duplicate #${tag} tag.`,
        ok: false,
      }
    }

    seenTagKeys.add(tagKey)
  }

  return {
    ok: true,
    tags: normalizedTags,
  }
}

function createDraftTags(tags: string[]) {
  return tags.map(createDraftTag)
}

function createDraftTag(value: string): DraftTag {
  return {
    id: crypto.randomUUID(),
    value,
  }
}

function getDraftTagValues(tags: DraftTag[]) {
  return tags.map((tag) => tag.value)
}

function syncDraftTagValues(currentTags: DraftTag[], nextValues: string[]) {
  return nextValues.map((value, index) => ({
    id: currentTags[index]?.id ?? crypto.randomUUID(),
    value,
  }))
}
