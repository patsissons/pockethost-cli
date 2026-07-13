<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

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
