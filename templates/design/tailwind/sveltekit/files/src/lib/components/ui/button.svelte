<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

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

  type Props = {
    class?: string
    variant?: Variant
    size?: Size
    href?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    onclick?: (event: MouseEvent) => void
    children?: Snippet
  }

  let {
    class: className = '',
    variant = 'default',
    size = 'default',
    href,
    type = 'button',
    disabled = false,
    onclick,
    children,
  }: Props = $props()

  const classes = $derived(
    cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className),
  )
</script>

{#if href}
  <a {href} data-slot="button" class={classes}>
    {#if children}{@render children()}{/if}
  </a>
{:else}
  <button {type} {disabled} {onclick} data-slot="button" class={classes}>
    {#if children}{@render children()}{/if}
  </button>
{/if}
