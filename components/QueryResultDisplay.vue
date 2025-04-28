<template>
  <div class="flex-grow border p-2 overflow-auto relative">
    <h3 class="font-semibold mb-2">Results</h3>

    <!-- Loading State -->
    <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
      <p class="text-lg font-medium">Loading results...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-red-600 bg-red-100 border border-red-400 p-3 rounded">
      <p><strong>Error:</strong> {{ error }}</p>
    </div>

    <!-- Results Table (for SPARQL JSON or generic JSON) -->
    <div v-else-if="results && (resultContentType?.includes('application/sparql-results+json') || resultContentType?.includes('application/json')) && resultBindings.length > 0">
      <table class="min-w-full divide-y divide-gray-200 border">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="header in resultHeaders" :key="header" scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r last:border-r-0">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(binding, index) in resultBindings" :key="index" class="hover:bg-gray-50">
            <td v-for="header in resultHeaders" :key="header" class="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r last:border-r-0">
              {{ binding[header]?.value ?? 'null' }}
              <span v-if="binding[header]?.type" class="text-xs text-gray-400 ml-1">({{ binding[header]?.type }})</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- No Results State (for SPARQL JSON or generic JSON) -->
    <div v-else-if="results && (resultContentType?.includes('application/sparql-results+json') || resultContentType?.includes('application/json')) && resultBindings.length === 0">
      <p class="text-gray-500">Query executed successfully, but returned no results.</p>
    </div>

    <!-- Text Results (Turtle/N-Triples/etc.) -->
    <ReadOnlyCodeEditor
      v-else-if="textResults && (resultContentType?.includes('text/turtle') || resultContentType?.includes('application/n-triples'))"
      :modelValue="textResults"
      :contentType="resultContentType"
    />

    <!-- Other Text/Plain Results -->
    <div v-else-if="textResults && resultContentType?.includes('text/plain')">
      <pre class="text-sm whitespace-pre-wrap">{{ textResults }}</pre>
    </div>

    <!-- Initial State / No results yet -->
    <div v-else-if="!isLoading && !error">
      <p class="text-gray-500">Execute a query to see results.</p>
    </div>

    <!-- Fallback for unexpected content types or empty results -->
    <div v-else-if="!isLoading && !error && !results && !textResults">
       <p class="text-gray-500">Query executed, but the response format is not currently displayed or is empty.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SparqlResults, SparqlBinding } from '@/types/query';
import ReadOnlyCodeEditor from '@/components/ReadOnlyCodeEditor.vue';

const props = defineProps<{
  isLoading: boolean;
  error: string | null;
  results: SparqlResults | null;
  textResults: string | null;
  resultContentType: string | null;
  resultHeaders: string[];
  resultBindings: SparqlBinding[];
}>();
</script>
