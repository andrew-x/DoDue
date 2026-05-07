import { z } from 'zod'

import type { UserProfile, UserProfileDocumentData } from '@/lib/data-model'
import { firestoreTimestampSchema } from '@/lib/firestore'
import { getUniqueTags, tagSchema } from '@/lib/tags'

export const userProfileTagsSchema = z.array(tagSchema).transform(getUniqueTags)

export const userProfileDocumentSchema = z
  .object({
    createdAt: firestoreTimestampSchema,
    id: z.string().min(1),
    tags: userProfileTagsSchema,
    updatedAt: firestoreTimestampSchema,
  })
  .strip() satisfies z.ZodType<UserProfileDocumentData>

export function parseUserProfileTags(tags: string[]) {
  return userProfileTagsSchema.parse(tags)
}

export function parseUserProfileDocument(
  id: string,
  data: unknown,
): UserProfile {
  const parsed = userProfileDocumentSchema.parse(data)

  if (parsed.id !== id) {
    throw new Error(`User profile document ID mismatch for ${id}`)
  }

  return {
    ...parsed,
    createdAt: parsed.createdAt.toDate(),
    updatedAt: parsed.updatedAt.toDate(),
  }
}
