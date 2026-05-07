import { useState } from 'react'

import { mergeTags } from '@/lib/tags'

export function useTagDraft(initialTags: string[] = []) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [draft, setDraft] = useState('')

  function reset(nextTags: string[] = []) {
    setTags(nextTags)
    setDraft('')
  }

  function handleDraftChange(value: string) {
    const normalizedValue = value.toLocaleLowerCase()

    if (!normalizedValue.includes(',')) {
      setDraft(normalizedValue)
      return
    }

    const nextTags = normalizedValue.split(',')
    const nextDraft = nextTags.pop() ?? ''

    setTags((currentTags) => mergeTags(currentTags, nextTags.join(',')))
    setDraft(nextDraft)
  }

  function handleDraftBlur() {
    if (!draft.trim()) {
      setDraft('')
      return
    }

    setTags((currentTags) => mergeTags(currentTags, draft))
    setDraft('')
  }

  function addTag(tag: string) {
    setTags((currentTags) => mergeTags(currentTags, tag))
    setDraft('')
  }

  return {
    addTag,
    draft,
    handleDraftBlur,
    handleDraftChange,
    reset,
    setDraft,
    setTags,
    tags,
  }
}
