import * as React from 'react'

import { cn } from '~/lib/utils'

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type Size = 'default' | 'sm' | 'lg' | 'icon'

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZE_CLASSES: Record<Size, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3',
  lg: 'h-10 px-6',
  icon: 'size-9',
}

const BASE_CLASSES =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  variant?: Variant
  size?: Size
  asChild?: boolean
}) {
  const classes = cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
    })
  }

  return (
    <button data-slot="button" className={classes} {...props}>
      {children}
    </button>
  )
}

export { Button }
