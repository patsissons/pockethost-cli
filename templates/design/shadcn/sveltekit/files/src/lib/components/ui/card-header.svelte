<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = { class?: string; children?: Snippet }

  let { class: className = '', children }: Props = $props()
</script>

<div
  data-slot="card-header"
  class={cn('grid auto-rows-min items-start gap-1.5 px-6', className)}
>
  {#if children}{@render children()}{/if}
</div>
