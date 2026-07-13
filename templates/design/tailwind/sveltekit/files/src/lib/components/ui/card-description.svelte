<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = { class?: string; children?: Snippet }

  let { class: className = '', children }: Props = $props()
</script>

<div data-slot="card-description" class={cn('text-muted-foreground text-sm', className)}>
  {#if children}{@render children()}{/if}
</div>
