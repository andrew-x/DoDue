import type { ErrorComponentProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/features/theme/theme-toggle'

export function ErrorBoundaryView({ error, reset }: ErrorComponentProps) {
  return (
    <main className="app-chrome relative grid min-h-svh place-items-center px-4 text-foreground">
      <ThemeToggle className="absolute top-4 right-4" />
      <section className="w-full max-w-lg rounded-lg border border-border/80 bg-background/80 p-8 text-center backdrop-blur">
        <AlertTriangle
          className="mx-auto size-8 text-destructive"
          aria-hidden="true"
        />
        <p className="mt-5 text-sm font-medium uppercase tracking-[0.16em] text-destructive">
          Error
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {error.message || 'An unexpected error interrupted this view.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link to="/">Go to landing</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
