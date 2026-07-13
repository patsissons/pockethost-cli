<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  type Props = HTMLInputAttributes & { class?: string }

  let {
    class: className = '',
    value = $bindable(''),
    type = 'text',
    ...rest
  }: Props = $props()
</script>

<input
  bind:value
  {type}
  data-slot="input"
  class={cn('input w-full', className)}
  {...rest}
/>
