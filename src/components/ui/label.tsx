import type * as React from 'react'

import { cn } from '@/lib/utils'

function Label({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: this primitive is associated with controls by its call sites.
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'grid gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
