import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import type { AuthContextValue } from '@/features/auth/auth-provider'
import { ErrorBoundaryView } from '@/pages/error-boundary-view'
import { HomePage } from '@/pages/home-page'
import { LandingPage } from '@/pages/landing-page'
import { NotFoundPage } from '@/pages/not-found-page'

export type RouterContext = {
  auth: AuthContextValue
}

const fallbackAuthContext: AuthContextValue = {
  error: null,
  isConfigured: false,
  isLoading: true,
  missingConfigKeys: [],
  signInWithGoogle: async () => {
    throw new Error('AuthProvider is not mounted')
  },
  signOut: async () => {
    throw new Error('AuthProvider is not mounted')
  },
  user: null,
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: ErrorBoundaryView,
  notFoundComponent: NotFoundPage,
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && context.auth.user) {
      throw redirect({
        to: '/home',
        replace: true,
      })
    }
  },
  component: LandingPage,
})

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && !context.auth.user) {
      throw redirect({
        to: '/',
        replace: true,
      })
    }
  },
  component: Outlet,
})

const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/home',
  component: HomePage,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  authenticatedRoute.addChildren([homeRoute]),
])

export const router = createRouter({
  routeTree,
  context: {
    auth: fallbackAuthContext,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
