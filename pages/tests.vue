<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-semibold">Component Tests</h1>
    <p class="text-sm text-gray-600">Mock API enabled: <span class="font-mono">{{ useMock ? 'true' : 'false' }}</span></p>
    <p class="text-sm">API URL: <code>{{ apiUrl }}</code></p>

    <div class="flex gap-6">
      <div class="w-1/3 border rounded">
        <LibrariesPanel />
      </div>
      <div class="w-2/3 space-y-4">
        <div class="border rounded p-2">
          <h2 class="text-lg font-semibold mb-2">Resource Lists</h2>
          <div class="grid grid-cols-2 gap-4">
            <ResourceList
              title="Queries"
              resourceType="query"
              :selectedItem="null"
              @selectItem="() => {}"
              @items-loaded="(items) => { queriesCount = items.length }"
            />
            <ResourceList
              title="Query Groups"
              resourceType="queryGroup"
              :selectedItem="null"
              @selectItem="() => {}"
              @items-loaded="(items) => { groupsCount = items.length }"
            />
          </div>
          <p class="text-xs text-gray-600 mt-2">Loaded: {{ queriesCount }} queries, {{ groupsCount }} groups</p>
        </div>
      </div>
    </div>

    <div class="mt-4 p-3 bg-gray-50 border rounded">
      <p class="text-sm">Tip: To use mocks, start dev with <code>NUXT_PUBLIC_USE_MOCK=1 pnpm dev</code>, then set API URL to <code>window.origin</code> in Admin via the "Use Mock API" button.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRuntimeConfig } from '#app'
import LibrariesPanel from '@/components/LibrariesPanel.vue'
import ResourceList from '@/components/ResourceList.vue'
import { useSettings } from '@/composables/useSettings'

const cfg = useRuntimeConfig()
const useMock = Boolean(cfg.public?.useMock)
const { apiUrl } = useSettings()

const queriesCount = ref(0)
const groupsCount = ref(0)
</script>

