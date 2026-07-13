<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = {
    class?: string
    for?: string
    children?: Snippet
  }

  let { class: className = '', for: htmlFor, children }: Props = $props()
</script>

<label
  for={htmlFor}
  data-slot="label"
  class={cn(
    'flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className,
  )}
>
  {#if children}{@render children()}{/if}
</label>
