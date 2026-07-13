<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = { class?: string; children?: Snippet }

  let { class: className = '', children }: Props = $props()
</script>

<div data-slot="card-title" class={cn('font-semibold leading-none', className)}>
  {#if children}{@render children()}{/if}
</div>
