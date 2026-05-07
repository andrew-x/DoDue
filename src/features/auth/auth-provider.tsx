import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getFirebaseAuth,
  isFirebaseConfigured,
  missingFirebaseConfigKeys,
} from '@/lib/firebase'

export type AuthContextValue = {
  error: Error | null
  isConfigured: boolean
  isLoading: boolean
  missingConfigKeys: readonly string[]
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  user: User | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(
      getFirebaseAuth(),
      (nextUser) => {
        setUser(nextUser)
        setIsLoading(false)
        setError(null)
      },
      (nextError) => {
        setError(nextError)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()

    await signInWithPopup(getFirebaseAuth(), provider)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isConfigured: isFirebaseConfigured,
      isLoading,
      missingConfigKeys: missingFirebaseConfigKeys,
      signInWithGoogle,
      signOut,
      user,
    }),
    [error, isLoading, signInWithGoogle, signOut, user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
