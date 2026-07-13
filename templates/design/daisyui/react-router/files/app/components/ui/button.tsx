import * as React from 'react'

import { cn } from '~/lib/utils'

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type Size = 'default' | 'sm' | 'lg' | 'icon'

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'btn-primary',
  destructive: 'btn-error',
  outline: 'btn-outline',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  link: 'btn-link',
}

const SIZE_CLASSES: Record<Size, string> = {
  default: '',
  sm: 'btn-sm',
  lg: 'btn-lg',
  icon: 'btn-square',
}

const BASE_CLASSES = 'btn'

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
