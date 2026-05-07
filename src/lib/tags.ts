import { z } from 'zod'

import { taskFieldLimits } from '@/lib/data-model'

export function normalizeTag(value: string) {
  return value.trim().replace(/^#/, '').toLocaleLowerCase()
}

export const getTagKey = normalizeTag

export function getUniqueTags(values: string[]) {
  const seenTags = new Set<string>()

  return values.map(normalizeTag).filter((tag) => {
    if (!tag || seenTags.has(tag)) {
      return false
    }

    seenTags.add(tag)
    return true
  })
}

export function mergeTags(tags: string[], value: string) {
  return getUniqueTags([...tags, ...value.split(',')])
}

export function getTagSuggestions({
  draft,
  excludedTagKeys = new Set<string>(),
  limit = 6,
  rememberedTags,
}: {
  draft: string
  excludedTagKeys?: Set<string>
  limit?: number
  rememberedTags: string[]
}) {
  const draftKey = getTagKey(draft)
  const suggestions: string[] = []

  for (const tag of getUniqueTags(rememberedTags)) {
    const tagKey = getTagKey(tag)

    if (excludedTagKeys.has(tagKey)) {
      continue
    }

    if (draftKey && !tagKey.startsWith(draftKey)) {
      continue
    }

    suggestions.push(tag)

    if (suggestions.length >= limit) {
      break
    }
  }

  return suggestions
}

export const tagSchema = z
  .string()
  .trim()
  .transform(normalizeTag)
  .pipe(z.string().min(1).max(taskFieldLimits.tagMaxLength))
