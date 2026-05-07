import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/auth-provider'
import { router } from '@/router'
import './styles/app.scss'

function App() {
  const auth = useAuth()
  const userId = auth.user?.uid ?? null

  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidation is triggered by these values changing, not consumed inside the effect.
  useEffect(() => {
    void router.invalidate()
  }, [auth.isLoading, userId])

  return <RouterProvider router={router} context={{ auth }} />
}

export default App
