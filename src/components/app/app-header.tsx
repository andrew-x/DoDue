import { LogOut, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/features/theme/theme-toggle'

export function AppHeader({
  displayName,
  onOpenSettings,
  onSignOut,
}: {
  displayName?: string | null
  onOpenSettings: () => void
  onSignOut: () => void
}) {
  return (
    <Card asChild className="flex items-center justify-between p-4">
      <header>
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/icon.svg"
            className="size-9 shrink-0"
            alt="DoDue"
            width="36"
            height="36"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-foreground">
              DoDue
            </p>
            {displayName ? (
              <p className="truncate text-xs text-muted-foreground">
                {displayName}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button
            aria-label="Open tag settings"
            onClick={onOpenSettings}
            size="icon"
            title="Tag settings"
            type="button"
            variant="outline"
          >
            <Settings className="size-4" />
          </Button>
          <Button variant="outline" onClick={onSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>
    </Card>
  )
}
