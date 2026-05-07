import { Link } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/features/theme/theme-toggle'

export function NotFoundPage() {
  return (
    <main className="app-chrome relative grid min-h-svh place-items-center px-4 text-foreground">
      <ThemeToggle className="absolute top-4 right-4" />
      <section className="w-full max-w-md rounded-lg border border-border/80 bg-background/80 p-8 text-center backdrop-blur">
        <SearchX className="mx-auto size-8 text-primary" aria-hidden="true" />
        <p className="mt-5 text-sm font-medium uppercase tracking-[0.16em] text-primary">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The page you requested does not exist.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/">Go to landing</Link>
        </Button>
      </section>
    </main>
  )
}
