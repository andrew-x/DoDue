import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function TaskRowActionButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      aria-label={label}
      className="h-6 gap-1 px-1.5 text-[0.7rem] text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      size="sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  )
}
