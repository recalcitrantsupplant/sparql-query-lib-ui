<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive } from 'radix-vue' // Keep Primitive import, remove PrimitiveProps type import
import { type ButtonVariants, buttonVariants } from '.'

interface Props { // Remove extends PrimitiveProps
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  asChild?: boolean // Define asChild
  as?: string     // Define as
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button', // Set default for as prop
})
</script>

<template>
  <Primitive
    data-slot="button"
    :as="props.as"
    :as-child="props.asChild"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
