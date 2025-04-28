<template>
  <div class="p-4 flex flex-col flex-grow overflow-hidden">
    <h2 class="text-lg font-semibold mb-4 flex-shrink-0">Queries</h2>
    <div class="overflow-y-auto flex-grow">
      <div v-if="isLoadingQueries" class="text-sm text-gray-500 italic">Loading queries...</div>
      <div v-else-if="errorQueries" class="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {{ errorQueries }}</div>
      <ul v-else-if="queriesList.length > 0">
        <li
          v-for="query in queriesList"
          :key="query['@id']"
          @click="selectQuery(query)"
          class="py-1 px-2 cursor-pointer hover:bg-gray-100 rounded text-sm truncate"
          :class="{ 'bg-blue-100 text-blue-700 font-semibold': selectedQuery?.['@id'] === query['@id'] }"
        >
          {{ query.name }}
        </li>
      </ul>
      <div v-else-if="!isLoadingQueries && selectedLibraryId" class="text-sm text-gray-500 italic">No queries found in this library.</div>
      <div v-else-if="!isLoadingQueries && !selectedLibraryId" class="text-sm text-gray-500 italic">Select a library to view queries.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type Ref } from 'vue';
import { useSettings } from '@/composables/useSettings';

// --- Types ---
interface IdReference {
  '@id': string;
}

interface QueryParameter {
    '@type': 'QueryParameter';
    paramName: string;
    allowedTypes?: string[];
}

interface QueryParameterGroup {
    '@type': 'QueryParameterGroup';
    vars: QueryParameter[];
}

interface Query {
  '@id': string;
  '@type': 'StoredQuery';
  name: string;
  description: string;
  query: string;
  queryType: string;
  outputVars: string[];
  parameters: QueryParameterGroup[] | null;
  'http://schema.org/isPartOf': IdReference[];
  'http://schema.org/dateCreated': string;
  'http://schema.org/dateModified': string;
}

// --- Props ---
const props = defineProps<{
  selectedQuery: Query | null;
}>();

// --- Emits ---
const emit = defineEmits(['selectQuery']);

// --- Settings & APIs ---
const { apiUrl, selectedLibraryId } = useSettings();

// --- State ---
const queriesList = ref<Query[]>([]);
const isLoadingQueries = ref(false);
const errorQueries = ref<string | null>(null);

// --- Methods ---
const fetchQueries = async (libraryId: string | null) => {
  if (!libraryId) {
    queriesList.value = [];
    isLoadingQueries.value = false;
    errorQueries.value = null;
    return;
  }

  isLoadingQueries.value = true;
  errorQueries.value = null;

  try {
    const fetchUrl = `${apiUrl.value}/api/queries?libraryId=${encodeURIComponent(libraryId)}`;
    console.log(`Fetching queries from: ${fetchUrl}`);

    const response = await fetch(fetchUrl);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json() as Query[];
    queriesList.value = data || [];

  } catch (err: any) {
    console.error('Error fetching queries:', err);
    errorQueries.value = err.message || 'Failed to load queries.';
    queriesList.value = [];
  } finally {
    isLoadingQueries.value = false;
  }
};

const selectQuery = (query: Query) => {
  emit('selectQuery', query);
};

// --- Watchers ---
watch(selectedLibraryId, (newId, oldId) => {
  console.log(`Library selection changed from ${oldId} to: ${newId}. Fetching queries...`);
  fetchQueries(newId);
}, { immediate: true });

// Expose fetchQueries so parent can trigger refresh after save/delete
defineExpose({
  fetchQueries
});
</script>
