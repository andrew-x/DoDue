import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-provider'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { getErrorMessage } from '@/lib/errors'

const cancelledSignInCodes = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

function isCancelledSignIn(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    cancelledSignInCodes.has((error as { code: string }).code)
  )
}

export function LandingPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [signInError, setSignInError] = useState<string | null>(null)
  const isBusy = auth.isLoading

  async function handleGoogleLogin() {
    if (auth.user) {
      await navigate({ to: '/home' })
      return
    }

    try {
      setSignInError(null)
      await auth.signInWithGoogle()
      await navigate({ to: '/home' })
    } catch (error) {
      if (isCancelledSignIn(error)) {
        return
      }

      setSignInError(getErrorMessage(error, 'Could not sign in.'))
    }
  }

  return (
    <main className="app-chrome relative grid min-h-svh place-items-center px-4 text-foreground">
      <ThemeToggle className="absolute top-4 right-4" />
      <section className="w-full max-w-xs text-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/icon.svg"
            className="size-20"
            alt=""
            width="80"
            height="80"
          />
          <h1 className="text-4xl font-semibold tracking-normal text-foreground">
            DoDue
          </h1>
        </div>
        <Button
          className="mt-8 w-full"
          disabled={!auth.isConfigured || isBusy}
          onClick={() => void handleGoogleLogin()}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          {auth.user ? 'Go to home' : 'Continue with Google'}
        </Button>
        {signInError ? (
          <p
            className="mt-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {signInError}
          </p>
        ) : null}
      </section>
    </main>
  )
}
