import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  doc,
  type FieldValue,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Transaction,
} from 'firebase/firestore'

import {
  parseUserProfileDocument,
  parseUserProfileTags,
} from '@/features/profile/profile-schema'
import type { UserProfile } from '@/lib/data-model'
import { getFirestoreDb } from '@/lib/firebase'
import { requireUserId } from '@/lib/firestore'
import { getUniqueTags } from '@/lib/tags'

export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string | undefined) =>
    [...profileKeys.all, 'detail', userId ?? 'signed-out'] as const,
}

export function userProfileDocument(userId: string) {
  return doc(getFirestoreDb(), 'users', userId)
}

export async function mergeUserProfileTagsInTransaction({
  tags,
  timestamp,
  transaction,
  userId,
}: {
  tags: string[]
  timestamp: FieldValue
  transaction: Transaction
  userId: string
}) {
  const normalizedTags = parseUserProfileTags(tags)

  if (normalizedTags.length === 0) {
    return
  }

  const profileRef = userProfileDocument(userId)
  const profileSnapshot = await transaction.get(profileRef)
  const existingTags = profileSnapshot.exists()
    ? parseUserProfileDocument(userId, profileSnapshot.data()).tags
    : []
  const mergedTags = getUniqueTags([...existingTags, ...normalizedTags])

  if (areTagsEqual(existingTags, mergedTags)) {
    return
  }

  if (profileSnapshot.exists()) {
    transaction.update(profileRef, {
      tags: mergedTags,
      updatedAt: timestamp,
    })
    return
  }

  transaction.set(profileRef, {
    createdAt: timestamp,
    id: userId,
    tags: mergedTags,
    updatedAt: timestamp,
  })
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const profileId = requireUserId(userId)
      const profileRef = userProfileDocument(profileId)
      const profileSnapshot = await getDoc(profileRef)

      if (profileSnapshot.exists()) {
        return parseUserProfileDocument(profileId, profileSnapshot.data())
      }

      const now = new Date()

      await setDoc(profileRef, {
        createdAt: serverTimestamp(),
        id: profileId,
        tags: [],
        updatedAt: serverTimestamp(),
      })

      return {
        createdAt: now,
        id: profileId,
        tags: [],
        updatedAt: now,
      } satisfies UserProfile
    },
    queryKey: profileKeys.detail(userId),
  })
}

export function useUpdateUserProfileTags(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tags: string[]) => {
      const profileId = requireUserId(userId)
      const normalizedTags = parseUserProfileTags(tags)

      await runTransaction(getFirestoreDb(), async (transaction) => {
        const profileRef = userProfileDocument(profileId)
        const profileSnapshot = await transaction.get(profileRef)
        const timestamp = serverTimestamp()

        if (profileSnapshot.exists()) {
          transaction.set(
            profileRef,
            {
              id: profileId,
              tags: normalizedTags,
              updatedAt: timestamp,
            },
            { merge: true },
          )
          return
        }

        transaction.set(profileRef, {
          createdAt: timestamp,
          id: profileId,
          tags: normalizedTags,
          updatedAt: timestamp,
        })
      })

      return normalizedTags
    },
    onSuccess: async (tags) => {
      queryClient.setQueryData<UserProfile>(
        profileKeys.detail(userId),
        (profile) =>
          profile
            ? {
                ...profile,
                tags,
                updatedAt: new Date(),
              }
            : profile,
      )

      await queryClient.invalidateQueries({
        queryKey: profileKeys.detail(userId),
      })
    },
  })
}

function areTagsEqual(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((tag, index) => tag === second[index])
  )
}
