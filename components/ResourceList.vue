<template>
  <div class="p-4 flex flex-col flex-grow overflow-hidden">
    <h2 class="text-lg font-semibold mb-4 flex-shrink-0">{{ title }}</h2>
    <div class="overflow-y-auto flex-grow">
      <div v-if="isLoading" class="text-sm text-gray-500 italic">Loading {{ title.toLowerCase() }}...</div>
      <div v-else-if="error" class="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {{ error }}</div>
      <ul v-else-if="itemsList.length > 0">
        <li
          v-for="item in itemsList"
          :key="item['@id']"
          @click="selectItemLocal(item)"
          class="py-1 px-2 cursor-pointer hover:bg-gray-100 rounded text-sm flex justify-between items-center"
          :class="{ 'bg-blue-100 text-blue-700 font-semibold': selectedItem?.['@id'] === item['@id'] }"
        >
          <span class="truncate">{{ item.name }}</span>
          <span v-if="item['http://schema.org/dateModified']" class="text-xs text-gray-500 italic ml-2 flex-shrink-0">
            {{ formatRelativeTime(item['http://schema.org/dateModified']) }}
          </span>
        </li>
      </ul>
      <div v-else-if="!isLoading && selectedLibraryId" class="text-sm text-gray-500 italic">No {{ title.toLowerCase() }} found in this library.</div>
      <div v-else-if="!isLoading && !selectedLibraryId" class="text-sm text-gray-500 italic">Select a library to view {{ title.toLowerCase() }}.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue';
import { useSettings } from '@/composables/useSettings';
import type { Query, QueryGroup, ResourceItem } from '@/types/query'; // Import ResourceItem
import { formatRelativeTime } from '@/lib/formatting'; // Import the helper

// --- Props ---
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  resourceType: {
    type: String as PropType<'query' | 'queryGroup'>,
    required: true,
    validator: (value: string) => ['query', 'queryGroup'].includes(value),
  },
  selectedItem: {
    type: Object as PropType<ResourceItem | null>,
    default: null,
  },
});

// --- Emits ---
const emit = defineEmits(['selectItem', 'items-loaded']); // Add 'items-loaded'

// --- Settings & APIs ---
const { apiUrl, selectedLibraryId } = useSettings();

// --- State ---
const itemsList = ref<ResourceItem[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// --- Computed ---
const apiEndpoint = computed(() => {
  switch (props.resourceType) {
    case 'query':
      return '/api/queries';
    case 'queryGroup':
      return '/api/queryGroups'; // Corrected endpoint
    default:
      // Should not happen due to validator, but good practice
      console.error('Invalid resourceType:', props.resourceType);
      return '';
  }
});

// --- Methods ---
const fetchItems = async (libraryId: string | null) => {
  if (!libraryId || !apiEndpoint.value) {
    itemsList.value = [];
    isLoading.value = false;
    error.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const fetchUrl = `${apiUrl.value}${apiEndpoint.value}?libraryId=${encodeURIComponent(libraryId)}`;
    console.log(`Fetching ${props.resourceType}s from: ${fetchUrl}`);

    const response = await fetch(fetchUrl);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Type assertion based on resourceType
    const data = await response.json() as ResourceItem[];
    // Sort items by dateModified descending, most recent first
    itemsList.value = (data || []).sort((a, b) => {
      const dateA = a['http://schema.org/dateModified'];
      const dateB = b['http://schema.org/dateModified'];
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Put items without dateModified last
      if (!dateB) return -1; // Put items without dateModified last
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Emit event after successful fetch and sort
    emit('items-loaded', itemsList.value);

  } catch (err: any) {
    console.error(`Error fetching ${props.resourceType}s:`, err);
    error.value = err.message || `Failed to load ${props.title.toLowerCase()}.`;
    itemsList.value = [];
  } finally {
    isLoading.value = false;
  }
};

const selectItemLocal = (item: ResourceItem | null) => {
  // Allow deselecting by passing null
  emit('selectItem', item);
};

// --- Watchers ---
watch(selectedLibraryId, (newId, oldId) => {
  console.log(`Library selection changed from ${oldId} to: ${newId}. Fetching ${props.resourceType}s...`);
  // Clear selection when library changes
  selectItemLocal(null);
  fetchItems(newId);
}, { immediate: true });

// Watch for changes in resourceType (might not be common, but for completeness)
watch(() => props.resourceType, (newType, oldType) => {
  console.log(`Resource type changed from ${oldType} to ${newType}. Fetching items...`);
  selectItemLocal(null); // Clear selection on type change
  fetchItems(selectedLibraryId.value); // Refetch with current library
});


// Expose fetchItems so parent can trigger refresh after save/delete
defineExpose({
  fetchItems
});
</script>
