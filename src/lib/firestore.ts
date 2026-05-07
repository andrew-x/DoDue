import { z } from 'zod'

import type { FirestoreTimestampLike } from '@/lib/data-model'

export function requireUserId(userId: string | undefined) {
  if (!userId) {
    throw new Error('A signed-in Firebase user is required')
  }

  return userId
}

export function isFirestoreTimestampLike(
  value: unknown,
): value is FirestoreTimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  )
}

export const firestoreTimestampSchema = z.custom<FirestoreTimestampLike>(
  isFirestoreTimestampLike,
  'Expected a Firestore Timestamp.',
)
