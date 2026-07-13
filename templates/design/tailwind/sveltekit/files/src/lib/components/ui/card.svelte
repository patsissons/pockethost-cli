<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = { class?: string; children?: Snippet }

  let { class: className = '', children }: Props = $props()
</script>

<div data-slot="card" class={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', className)}>
  {#if children}{@render children()}{/if}
</div>
