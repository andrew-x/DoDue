import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from './theme-provider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      aria-label="Toggle color theme"
      aria-pressed={isDark}
      className={cn(
        'border-border/80 bg-background/72 backdrop-blur',
        className,
      )}
      onClick={toggleTheme}
      size="icon"
      title={label}
      type="button"
      variant="outline"
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  )
}
