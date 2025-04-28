<script setup lang="ts">
import { Toaster as Sonner } from '@/components/ui/sonner'
</script>

<template>
  <div>
    <Sonner />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
