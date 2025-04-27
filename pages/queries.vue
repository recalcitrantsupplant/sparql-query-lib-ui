<template>
  <div class="flex h-screen">
    <!-- Combined Left Panel: Libraries and Queries -->
    <div class="w-1/4 border-r flex flex-col">
      <!-- Libraries Panel (now takes full width of this column) -->
      <LibrariesPanel />

      <!-- Divider (optional, for visual separation) -->
      <hr class="my-4 border-gray-300">

      <!-- Queries List Section -->
      <div class="p-4 flex flex-col flex-grow overflow-hidden">
        <h2 class="text-lg font-semibold mb-4 flex-shrink-0">Queries</h2>
        <div class="mb-2 flex-shrink-0">
          <div v-if="!isCreatingQuery">
            <button
              @click="startCreatingQuery"
              :disabled="!selectedLibraryId"
              class="w-full text-left py-1 px-2 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ Create New Query
            </button>
          </div>
          <div v-else>
            <Input
              ref="newQueryNameInput"
              v-model="newQueryName"
              @blur="finishCreatingQuery"
              @keyup.enter="finishCreatingQuery"
              @keyup.esc="cancelCreatingQuery"
              placeholder="New Query Name..."
              class="text-sm h-7" />
          </div>
        </div>
        <div class="overflow-y-auto flex-grow">
          <div v-if="isLoadingQueries" class="text-sm text-gray-500 italic">Loading queries...</div>
          <div v-else-if="errorQueries" class="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {{ errorQueries }}</div>
          <!-- Iterate directly over queriesList now -->
          <ul v-else-if="queriesList.length > 0 || isCreatingQuery">
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
    </div>

    <!-- Right Content Area: Editor, Analysis, and Results -->
    <div class="w-3/4 p-4 flex flex-col">
       <!-- Static Header -->
       <div class="flex justify-between items-center mb-2">
         <h2 class="text-xl font-semibold">SPARQL Editor</h2>
         <!-- Top Right Action Buttons (Save/Discard) -->
         <div class="flex items-center gap-2 flex-shrink-0">
           <Button
             @click="saveQuery"
             variant="default"
             size="sm"
             :title="saveButtonTitle"
           >
             {{ isSaving ? 'Saving...' : 'Save Query' }}
           </Button>
           <Button
             @click="discardChanges"
             :disabled="!isQueryModified || isSaving"
             variant="outline"
             size="sm"
           >
             Discard Changes
           </Button>
         </div>
       </div>

       <!-- Query Details Section (Name, ID, Description) -->
       <div class="mb-3 border p-3 rounded bg-gray-50">
         <!-- Edit Mode -->
         <!-- Reverted structure, applying flex classes carefully -->
         <div v-if="isEditingDetails" class="space-y-3">
           <!-- Wrap Name and ID divs in a flex container -->
           <div class="flex gap-4 items-start">
             <div class="flex-1"> <!-- Name Field -->
               <label for="queryName" class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
               <Input
                 id="queryName"
                 v-model="editedName"
                 placeholder="Enter Query Name (mandatory)"
                 class="text-sm"
                 required
               />
             </div>
             <div class="flex-1"> <!-- ID Field -->
               <label for="queryId" class="block text-sm font-medium text-gray-700 mb-1">
                 ID {{ selectedQuery ? '(Read-only)' : '(Optional URI)' }}
               </label>
               <Input
                 id="queryId"
                 v-model="editedId"
                 :placeholder="selectedQuery ? selectedQuery['@id'] : 'Leave blank to auto-generate URI'"
                 class="text-sm"
                 :class="{ 'border-red-500': !selectedQuery && editedId && !isValidUri(editedId), 'bg-gray-100': !!selectedQuery }"
                 :disabled="!!selectedQuery"
                 :title="selectedQuery ? 'ID cannot be changed after creation' : 'Optionally provide a valid URI for the query ID'"
               />
               <p v-if="!selectedQuery && editedId && !isValidUri(editedId)" class="text-xs text-red-600 mt-1">Must be a valid URI (e.g., http://example.com/query/my-query)</p>
               <p v-else-if="!selectedQuery" class="text-xs text-gray-500 mt-1">If provided during creation, must be a valid URI. Auto-generated if left blank.</p>
               <p v-else class="text-xs text-gray-500 mt-1">ID is auto-generated or set during creation and cannot be changed.</p>
             </div>
           </div>
           <!-- Apply flex to the existing Description div -->
           <div class="flex gap-2 items-start">
             <label for="queryDescription" class="block text-sm font-medium text-gray-700 pt-1.5 w-20 flex-shrink-0">Description</label>
             <Textarea
               id="queryDescription"
               v-model="editedDescription"
               placeholder="Query Description (optional)"
               rows="2"
               class="resize-none text-sm flex-grow"
               title="Enter an optional description"
             />
           </div>
         </div>
         <!-- View Mode -->
         <div v-else class="space-y-1">
            <div v-if="selectedQuery" class="flex justify-between items-start">
              <div>
                <p class="text-sm"><strong class="font-medium text-gray-600 w-16 inline-block">Name:</strong> {{ selectedQuery.name }}</p>
                <p class="text-sm"><strong class="font-medium text-gray-600 w-16 inline-block">ID:</strong> <code class="text-xs bg-gray-100 px-1 rounded">{{ selectedQuery['@id'] }}</code></p>
                <p class="text-sm"><strong class="font-medium text-gray-600 w-16 inline-block">Desc:</strong> {{ selectedQuery.description || '-' }}</p>
              </div>
              <Button @click="startEditingDetails" variant="outline" size="sm" class="ml-4 flex-shrink-0">
                Edit Details
              </Button>
            </div>
            <div v-else class="text-sm text-gray-500 italic">
              Select or create a query to view/edit details.
            </div>
         </div>
       </div>

       <!-- Flex container for Editor/Results and Analysis Sidebar -->
       <div class="flex flex-grow gap-4 overflow-hidden">

        <!-- Left part: Editor and Results (takes more space, e.g., 2/3) -->
        <div class="flex flex-col flex-grow" style="flex-basis: 66.66%;">
          <Codemirror
            v-model="code"
            placeholder="Enter SPARQL query..."
            :style="{ height: '300px', border: '1px solid #ccc' }"
            :autofocus="true"
            :indent-with-tab="true"
            :tab-size="2"
            :extensions="extensions"
          />
          <!-- Execute Button & Backend Selector -->
          <div class="my-3 flex items-center gap-2">
            <Button
              @click="executeQuery"
              :disabled="!canExecute"
              variant="secondary"
            >
              Execute Query
            </Button>
            <!-- Execution Backend Selector -->
            <Select v-model="selectedBackendId" :disabled="isLoadingBackends || executionBackends.length === 0">
              <SelectTrigger class="w-[250px]">
                <SelectValue placeholder="Select Execution Backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-if="isLoadingBackends" value="loading" disabled>Loading backends...</SelectItem>
                <SelectItem v-else-if="errorBackends" value="error" disabled>Error loading</SelectItem>
                <SelectItem v-else-if="executionBackends.length === 0" value="none" disabled>No backends configured</SelectItem>
                <SelectItem
                  v-for="backend in executionBackends"
                  :key="backend['@id']"
                  :value="backend['@id']"
                >
                  {{ backend.name }} ({{ backend.backendType }})
                </SelectItem>
              </SelectContent>
            </Select>
            <!-- Media Type Selector -->
            <Select v-model="selectedMediaType">
              <SelectTrigger class="w-[200px]">
                <SelectValue placeholder="Select Media Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="mediaType in mediaTypes"
                  :key="mediaType.value"
                  :value="mediaType.value"
                >
                  {{ mediaType.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <span v-if="isLoadingBackends" class="text-xs text-gray-500 italic">Loading...</span>
            <span v-else-if="errorBackends" class="text-xs text-red-500 italic">Error</span>
          </div>

          <!-- SPARQL Parse Error Display -->
          <div v-if="parseError" class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4 text-sm" role="alert">
            <strong class="font-bold">Parse Error:</strong>
            <span class="block sm:inline whitespace-pre-wrap">{{ parseError }}</span>
          </div>
          <!-- Results Display -->
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

            <!-- Results Table (for SPARQL JSON) -->
            <div v-else-if="results && resultContentType?.includes('application/sparql-results+json') && resultBindings.length > 0">
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

            <!-- No Results State (for SPARQL JSON) -->
            <div v-else-if="results && resultContentType?.includes('application/sparql-results+json') && resultBindings.length === 0">
              <p class="text-gray-500">Query executed successfully, but returned no results.</p>
            </div>

            <!-- Text Results (Turtle/N-Triples/etc.) -->
            <div v-else-if="textResults && (resultContentType?.includes('text/turtle') || resultContentType?.includes('application/n-triples'))">
              <!-- Container for the read-only CodeMirror instance -->
              <div ref="readOnlyEditorContainer" class="border border-gray-300 rounded"></div>
            </div>

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
          </div> <!-- End Left part -->

        <!-- Right part: Analysis Sidebar (takes less space, e.g., 1/3) -->
        <div class="flex flex-col space-y-4" style="flex-basis: 33.33%;">

          <!-- Parameters Box -->
          <div class="border p-2 min-h-[6rem] overflow-auto relative" :class="{ 'opacity-50 pointer-events-none': hasParseError || isEditingQuery }">
            <div class="flex justify-between items-center mb-1">
              <h3 class="font-semibold">Parameters</h3>
              <!-- Toggle Button -->
              <div class="flex text-xs border rounded overflow-hidden">
                <span
                  class="px-2 py-1 cursor-pointer"
                  :class="{ 'bg-blue-500 text-white': parameterMode === 'Auto', 'bg-gray-100 hover:bg-gray-200': parameterMode !== 'Auto' }"
                  @click="parameterMode = 'Auto'"
                >
                  Auto
                </span>
                <span
                  class="px-2 py-1 cursor-pointer"
                  :class="{ 'bg-blue-500 text-white': parameterMode === 'Specify', 'bg-gray-100 hover:bg-gray-200': parameterMode !== 'Specify' }"
                  @click="parameterMode = 'Specify'"
                >
                  Specify
                </span>
              </div>
            </div>
            <!-- Analysis Loading State -->
            <div v-if="isLoadingAnalysis" class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center text-sm text-gray-600">
              Analyzing...
            </div>
            <!-- Analysis Error State (Show only if NOT a parse error) -->
            <div v-else-if="errorAnalysis && !hasParseError" class="text-xs text-red-600 bg-red-50 p-1 rounded">
              <strong>Error:</strong> {{ errorAnalysis }}
            </div>
            <!-- Parameters Results -->
            <div v-else class="text-sm">
              <span v-if="queryParameters.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span v-for="param in queryParameters" :key="param" class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                  {{ param }}
                </span>
              </span>
              <span v-else class="text-gray-500 text-xs italic ml-1">None detected</span>
            </div>
          </div>

          <!-- Outputs Box -->
          <div class="border p-2 min-h-[6rem] overflow-auto relative" :class="{ 'opacity-50 pointer-events-none': hasParseError || isEditingQuery }">
            <h3 class="font-semibold mb-1">Outputs</h3>
            <!-- Analysis Loading State -->
             <div v-if="isLoadingAnalysis" class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center text-sm text-gray-600">
              Analyzing...
            </div>
            <!-- Analysis Error State (Show only if NOT a parse error) -->
            <div v-else-if="errorAnalysis && !hasParseError" class="text-xs text-red-600 bg-red-50 p-1 rounded">
              <strong>Error:</strong> {{ errorAnalysis }}
            </div>
            <!-- Outputs Results -->
            <div v-else class="text-sm">
              <span v-if="queryOutputs.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span v-for="output in queryOutputs" :key="output" class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                  {{ output }}
                </span>
              </span>
              <span v-else class="text-gray-500 text-xs italic ml-1">None detected</span>
            </div>
          </div>

        </div> <!-- End Analysis Sidebar -->

      </div> <!-- End Flex container for Editor/Results and Analysis -->

    </div> <!-- End Right Content Area -->
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick, onMounted } from 'vue';
import { Codemirror } from 'vue-codemirror'
import { sparql } from 'codemirror-lang-sparql'
// Import necessary CodeMirror parts for the read-only viewer
import { EditorView } from '@codemirror/view' // Import EditorView from the correct package
// import { basicSetup } from 'codemirror' // Remove basicSetup import
import { EditorState, type Extension } from '@codemirror/state' // Use type-only import for Extension
import { StreamLanguage } from '@codemirror/language' // Import StreamLanguage
import { turtle } from 'codemirror-lang-turtle' // Import turtle language mode

import { refDebounced } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea/index' // Corrected import path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup, // Added SelectGroup
  SelectLabel, // Added SelectLabel
} from '@/components/ui/select'
import LibrariesPanel from '@/components/LibrariesPanel.vue'
import { useSettings } from '@/composables/useSettings'
import { useExecutionBackendsApi, type ExecutionBackend } from '@/composables/useExecutionBackendsApi' // Added backend composable
import mediaTypes from '@/assets/data/mediaTypes.json'; // Import media types

// --- Settings & APIs ---
const { apiUrl, selectedLibraryId } = useSettings(); // Add selectedLibraryId
const {
  backends: executionBackends,
  loading: isLoadingBackends,
  error: errorBackends,
  fetchBackends,
} = useExecutionBackendsApi();

// --- Types ---
// Define the structure for a query object from the API (matching def-17)
interface IdReference {
  '@id': string;
}
interface Query {
  '@id': string; // Use @id from schema
  '@type': 'StoredQuery';
  name: string;
  description: string;
  query: string;
  queryType: string;
  outputVars: string[];
  parameters: any[] | null; // Adjust type if needed based on def-15
  'http://schema.org/isPartOf': IdReference[]; // Array of library/group references
  'http://schema.org/dateCreated': string;
  'http://schema.org/dateModified': string;
}

// Type for a single binding value (e.g., URI, literal, blank node)
interface SparqlBindingValue {
  type: 'uri' | 'literal' | 'typed-literal' | 'bnode';
  value: string;
  datatype?: string; // For typed-literals
  'xml:lang'?: string; // For literals with language tags
}

// Type for a single result row (binding)
type SparqlBinding = Record<string, SparqlBindingValue | undefined>;

// Type for the overall SPARQL results JSON structure
interface SparqlResults {
  head: {
    vars: string[];
    link?: string[]; // Optional links
  };
  results: {
    bindings: SparqlBinding[];
  };
  boolean?: boolean; // For ASK queries
}

// Type for the analysis endpoints (outputs/parameters)
type SparqlAnalysisResult = string[];


// --- State ---
// Toggle button state
const parameterMode = ref<'Auto' | 'Specify'>('Auto'); // Default to Auto

// Selected Query and Edit State
const selectedQuery = ref<Query | null>(null)
const editedName = ref('')
const editedDescription = ref('');
const editedId = ref(''); // Added for optional ID editing
const isEditingDetails = ref(false); // Controls view/edit mode for details

// Store initial state for comparison in isQueryModified
const initialName = ref('');
const initialDescription = ref('');
const initialCode = ref('');

// State for creating a new query inline
const isCreatingQuery = ref(false)
const newQueryName = ref('')
const newQueryNameInput = ref<InstanceType<typeof Input> | null>(null) // Ref for the input component

// Editor Content
const code = ref(`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT * WHERE {
  ?sub ?pred ?obj .
} LIMIT 10
`)

const codeForAnalysis = refDebounced(code, 300)
const extensions = shallowRef([sparql()])

// SPARQL Execution State
const results = ref<SparqlResults | null>(null) // For JSON results
const textResults = ref<string | null>(null) // For Turtle/N-Triples/other text results
const resultContentType = ref<string | null>(null) // Store the content type of the response
const isLoading = ref(false)
const error = ref<string | null>(null)

// Query Analysis State
const isEditingQuery = ref(false) // Track if query is edited but analysis pending

// State for analysis results
const queryOutputs = ref<SparqlAnalysisResult>([])
const queryParameters = ref<SparqlAnalysisResult>([])
const isLoadingAnalysis = ref(false)
const errorAnalysis = ref<string | null>(null)
const parseError = ref<string | null>(null)
const hasParseError = ref(false)

// Query List State
const queriesList = ref<Query[]>([]) // Holds queries for the selected library
const isLoadingQueries = ref(false)
const errorQueries = ref<string | null>(null)
const isSaving = ref(false); // Track save operation
const selectedBackendId = ref<string | null>(null); // ID of the selected execution backend
const selectedMediaType = ref<string>('application/sparql-results+json'); // Default media type


// --- Helpers ---
// Basic URI validation (can be improved)
const isValidUri = (uri: string): boolean => {
  if (!uri) return true; // Empty is valid (means auto-generate)
  try {
    new URL(uri);
    // Additional checks could go here (e.g., ensure it's http/https)
    return uri.startsWith('http://') || uri.startsWith('https://');
  } catch (_) {
    return false;
  }
};

// --- Methods for Details Editing ---
const startEditingDetails = () => {
  if (!selectedQuery.value && !isCreatingQuery.value && !editedName.value) {
    // If trying to edit details for a *new* query that hasn't even had its name confirmed yet via the list input.
    // Or if no query is selected at all.
    // We should ideally be in the 'Create New Query' list input flow or have selected a query.
    // Let's just ensure the fields are ready for a new query if nothing is selected/in progress.
    prepareNewQueryState(); // Reset everything, sets isEditingDetails = true
    console.log('Starting edit details for a potentially new query.');
  } else if (selectedQuery.value) {
    // Editing an existing query's details
    editedName.value = selectedQuery.value.name;
    editedId.value = selectedQuery.value['@id'];
    editedDescription.value = selectedQuery.value.description;
    isEditingDetails.value = true;
    console.log('Starting edit details for existing query:', selectedQuery.value.name);
  }
  // If isCreatingQuery is true but name not yet set, this button shouldn't be visible.
  // If isCreatingQuery is false but editedName has value (meaning new query name was confirmed),
  // then selectedQuery is null, and prepareNewQueryState was already called by finishCreatingQuery.
  // We just need to ensure edit mode is on.
  else if (!isCreatingQuery.value && editedName.value && !selectedQuery.value) {
     isEditingDetails.value = true; // Should already be true from finishCreatingQuery, but ensure it.
     console.log('Ensuring edit details mode is on for new query being defined.');
  }
};


// --- Computed ---

// Title for the save button providing context
const saveButtonTitle = computed(() => {
  if (!selectedLibraryId.value) return 'Select a library first';
  if (!editedName.value.trim()) return 'Query Name is required';
  if (editedId.value && !isValidUri(editedId.value)) return 'Provided ID must be a valid URI';
  if (hasParseError.value) return 'Cannot save with SPARQL parse errors';
  if (!isQueryModified.value) return 'No changes to save';
  if (isSaving.value) return 'Saving...';
  return selectedQuery.value ? 'Save changes to query' : 'Save new query';
});

// Check if the current edited state differs from the stored initial state
const isQueryModified = computed(() => {
  if (!selectedLibraryId.value) return false;

  // Compare current edited values against the stored initial values
  const nameChanged = editedName.value !== initialName.value;
  const descriptionChanged = editedDescription.value !== initialDescription.value;
  const codeChanged = code.value !== initialCode.value;
  // For new queries, ID is only considered 'changed' if it goes from empty to non-empty
  // For existing queries, ID cannot change, so this check is implicitly handled.
  const idChanged = !selectedQuery.value && editedId.value.trim() !== ''; // Only relevant for new queries

  if (selectedQuery.value) {
    // Existing query: Check name, description, code
    return nameChanged || descriptionChanged || codeChanged;
  } else {
    // New query: Check if name exists (it should after finishCreatingQuery sets initialName)
    // AND if description, code, or ID has changed from the initial state set by prepare/finish.
    const hasName = !!editedName.value.trim(); // Still need a name to save
    return hasName && (descriptionChanged || codeChanged || idChanged);
  }
});

// Extract headers for the results table
const resultHeaders = computed(() => {
  if (!results.value?.head?.vars) return []
  return results.value.head.vars
})

// Extract bindings for the results table rows
const resultBindings = computed<SparqlBinding[]>(() => { // Added type to computed
  if (!results.value?.results?.bindings) return []
  return results.value.results.bindings
})

// Check if execution is possible (for the documented /api/execute endpoint)
const canExecute = computed(() => {
  return !isLoading.value &&
         !!selectedQuery.value?.['@id'] && // Must have a saved query selected
         !!selectedBackendId.value &&     // Must have a backend selected
         !isLoadingBackends.value &&      // Backends must not be loading
         !isSaving.value;                 // Not currently saving
});


// --- Methods ---

// Fetch queries from the API, optionally filtering by libraryId
const fetchQueries = async (libraryId: string | null) => {
  // Cancel query creation if in progress when library changes
  if (isCreatingQuery.value) {
    cancelCreatingQuery();
  }
  if (!libraryId) {
    queriesList.value = []; // Clear list if no library is selected
    selectedQuery.value = null; // Clear selected query
    isLoadingQueries.value = false;
    errorQueries.value = null;
    return;
  }

  isLoadingQueries.value = true
  errorQueries.value = null
  selectedQuery.value = null; // Clear selected query when fetching new list

  try {
    // Construct the URL with the libraryId query parameter
    const fetchUrl = `${apiUrl.value}/api/queries?libraryId=${encodeURIComponent(libraryId)}`;
    console.log(`Fetching queries from: ${fetchUrl}`);

    // Use Nuxt's useFetch for server/client fetching
    // We need to make this fetch reactive or manually trigger it, useFetch is tricky here
    // Let's use standard fetch within the watcher for simplicity now
    const response = await fetch(fetchUrl);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json() as Query[];
    queriesList.value = data || []; // Ensure it's an empty array if data is null/undefined

  } catch (err: any) {
    console.error('Error fetching queries:', err)
    errorQueries.value = err.message || 'Failed to load queries.'
    queriesList.value = [] // Clear list on error
  } finally {
    isLoadingQueries.value = false
  }
}

// Select a query from the list
const selectQuery = (query: Query) => {
  // Cancel query creation if in progress
  if (isCreatingQuery.value) {
    cancelCreatingQuery();
  }
  selectedQuery.value = query
  editedName.value = query.name // Populate edit fields
  editedDescription.value = query.description // Populate edit fields
  editedId.value = query['@id']; // Populate editedId as well
  code.value = query.query; // Update the editor content

  // Store initial state for comparison
  initialName.value = query.name;
  initialDescription.value = query.description;
  initialCode.value = query.query;

  results.value = null; // Clear previous results
  error.value = null; // Clear previous execution error
  parseError.value = null // Clear parse error
  hasParseError.value = false
  isEditingDetails.value = false // Switch back to view mode when selecting an existing query
  // Analysis will automatically trigger due to the 'code' watcher
  console.log(`Selected query: ${query.name}`)
}

// Discard changes made to the current query
const discardChanges = () => {
  if (!isQueryModified.value) return; // Nothing to discard

  if (selectedQuery.value) {
    // Revert to the selected query's state
    editedName.value = selectedQuery.value.name;
    editedDescription.value = selectedQuery.value.description;
    code.value = selectedQuery.value.query;
    editedId.value = selectedQuery.value['@id']; // Also revert ID
    // Analysis will re-trigger via watcher
    isEditingDetails.value = false; // Exit edit mode
    console.log(`Discarded changes for query: ${selectedQuery.value.name}`);
  } else {
    // If it was a new query being edited (selectedQuery is null), reset state and cancel creation
    console.log('Discarding changes for a new query.');
    prepareNewQueryState(); // Reset editor state (includes setting isEditingDetails = true)
    cancelCreatingQuery(); // Ensure creation mode is exited (list input)
    // Since prepareNewQueryState sets isEditingDetails = true, we might want to reset it if cancelling *before* name entry?
    // Let's assume discard is only relevant *after* name entry or when editing existing.
    // If cancelling the list input, cancelCreatingQuery handles it.
    // If cancelling after name entry, prepareNewQueryState resets to a fresh new query state (in edit mode).
  }
  // Clear results and errors as the query state has reverted
  results.value = null;
  error.value = null;
  parseError.value = null;
  hasParseError.value = false;
  errorAnalysis.value = null; // Clear analysis errors too
  // isEditingDetails is handled within the if/else branches
}

// Reset editor state for a new query (called by startCreatingQuery/discardChanges)
const prepareNewQueryState = () => {
  selectedQuery.value = null; // Deselect any current query
  const newQueryInitialCode = `SELECT * WHERE {
  ?s ?p ?o .
  VALUES ?p { UNDEF }
}`; // Define it once here
  code.value = newQueryInitialCode;
  results.value = null;
  error.value = null;
  queryOutputs.value = []
  queryParameters.value = []
  editedName.value = '' // Clear name for new query
  editedDescription.value = '' // Clear description
  editedId.value = ''; // Clear ID for new query
  errorAnalysis.value = null;
  parseError.value = null;
  hasParseError.value = false;

  // Store initial state for comparison
  initialName.value = ''; // Name is set later via input
  initialDescription.value = '';
  initialCode.value = newQueryInitialCode; // Store the exact initial code

  isEditingDetails.value = true; // Start in edit mode for a new query
  console.log('Prepared state for new query (edit mode enabled)');
};

// Start the inline query creation process
const startCreatingQuery = async () => {
  if (!selectedLibraryId.value) {
    alert('Please select a library first.');
    return;
  }
  prepareNewQueryState(); // Reset editor etc.
  editedName.value = ''; // Clear name specifically for the new one
  newQueryName.value = ''; // Clear the input model
  isCreatingQuery.value = true;
  console.log('Started creating new query');
  await nextTick(); // Wait for the DOM to update
  // Focus the input element within the Input component
  const inputRef = newQueryNameInput.value;
  // Check if inputRef exists and has an $el property which is an HTMLElement
  if (inputRef && inputRef.$el && inputRef.$el instanceof HTMLElement) {
    // Find the actual input element within the component's rendered DOM
    const inputElement = inputRef.$el.querySelector('input');
    if (inputElement) {
      inputElement.focus();
    } else {
       // Fallback: try focusing the root element if input isn't found (less likely to work)
       inputRef.$el.focus();
    }
  } else {
      console.warn('Could not focus new query name input.');
  }
};

// Finish creating query name (on blur or enter)
const finishCreatingQuery = () => {
  const finalName = newQueryName.value.trim();
  if (!finalName) {
    cancelCreatingQuery(); // If name is empty, cancel
    return;
  }
  editedName.value = finalName; // Set the actual editedName for saving
  initialName.value = finalName; // Store the initial name *after* it's confirmed
  isCreatingQuery.value = false; // Exit list input mode
  isEditingDetails.value = true; // Ensure details are in edit mode
  editedId.value = ''; // Ensure ID is clear initially for new query
  editedDescription.value = ''; // Ensure description is clear initially
  console.log(`Set new query name to: ${finalName}, entering details edit mode.`);
  // Now the user can edit the details (ID, Desc) and code, then save
};

// Cancel the inline query creation
const cancelCreatingQuery = () => {
  isCreatingQuery.value = false;
  newQueryName.value = '';
  // If no query was selected after cancelling, maybe select the first one?
  // Or just leave it blank. Let's leave it blank for now.
  // If a query *was* selected before starting creation, prepareNewQueryState() cleared it.
  // We might want to restore the previous selection, but that adds complexity.
  console.log('Cancelled creating new query');
};


// Execute the selected stored query against the selected backend
const executeQuery = async () => {
  if (!canExecute.value || !selectedQuery.value || !selectedBackendId.value) {
      console.warn('Execution conditions not met.');
      return;
  }

  isLoading.value = true;
  error.value = null;
  results.value = null; // Clear JSON results
  textResults.value = null; // Clear text results
  resultContentType.value = null; // Clear content type

  const requestBody = {
    targetId: selectedQuery.value['@id'],
    backendId: selectedBackendId.value,
    // arguments: [] // Add arguments later if needed
  };

  try {
    const executeUrl = `${apiUrl.value}/api/execute/`;
    console.log(`Executing stored query: ${requestBody.targetId} against backend: ${requestBody.backendId} via ${executeUrl}`);

    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': selectedMediaType.value, // Use the selected media type
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        // Attempt to parse JSON error response from the API
        const errorJson = JSON.parse(errorText);
        detail = errorJson.error || errorJson.message || errorText; // Look for common error fields
      } catch (e) { /* Ignore parsing error, use raw text */ }
      throw new Error(`HTTP error! status: ${response.status}, message: ${detail}`);
    }

    // Store the content type
    resultContentType.value = response.headers.get('Content-Type');
    console.log(`Response Content-Type: ${resultContentType.value}`);

    // Handle response based on content type
    if (resultContentType.value?.includes('application/sparql-results+json')) {
      results.value = await response.json() as SparqlResults;
      console.log('Execution successful, JSON results received.');
    } else if (resultContentType.value?.includes('text/turtle') || resultContentType.value?.includes('application/n-triples') || resultContentType.value?.includes('text/plain')) {
      textResults.value = await response.text();
      console.log('Execution successful, Text results received.');
      // Trigger CodeMirror update after DOM updates
      await nextTick();
      setupReadOnlyEditor();
    } else {
      // Handle other content types or fallback
      textResults.value = await response.text(); // Store as text for now
      console.warn(`Received unexpected content type: ${resultContentType.value}. Displaying as plain text.`);
    }

  } catch (err: any) {
    console.error('Error executing stored query:', err);
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = err.message || 'Failed to execute stored query.';
  } finally {
    isLoading.value = false;
  }
};

// Save the current query (Create or Update)
const saveQuery = async () => {
  if (!isQueryModified.value || !selectedLibraryId.value || !editedName.value.trim()) {
    console.warn('Save condition not met.');
    // Additional check for valid URI if ID is provided during creation
    if (!selectedQuery.value && editedId.value && !isValidUri(editedId.value)) {
      console.warn('Save condition not met: Invalid URI provided for new query ID.');
      // Optionally show a user-facing error message here
      return;
    }
    console.warn('Save condition not met.');
    return; // Don't save if not modified, no library, no name, or invalid ID on create
  }

  isSaving.value = true;
  errorQueries.value = null; // Clear previous save errors

  // Base query data for both create and update
  const queryData: {
    name: string;
    description: string;
    query: string;
    libraryId: string;
    id?: string; // Optional ID field
  } = {
    name: editedName.value.trim(),
    description: editedDescription.value.trim(),
    query: code.value,
    libraryId: selectedLibraryId.value,
    // outputVars: queryOutputs.value, // Example
  };

  // Add the ID only if creating a new query AND it's provided and valid
  if (!selectedQuery.value && editedId.value.trim() && isValidUri(editedId.value.trim())) {
    queryData.id = editedId.value.trim();
    console.log(`Including provided ID in create payload: ${queryData.id}`);
  }

  try {
    let response: Response;
    let url: string;
    let method: string;

    if (selectedQuery.value) {
      // Update existing query (PUT)
      url = `${apiUrl.value}/api/queries/${encodeURIComponent(selectedQuery.value['@id'])}`;
      method = 'PUT';
      console.log(`Updating query: ${url}`);
    } else {
      // Create new query (POST)
      url = `${apiUrl.value}/api/queries`;
      method = 'POST';
      console.log(`Creating new query: ${url}`);
    }

    response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const savedQuery = await response.json() as Query;
    console.log('Query saved successfully:', savedQuery);

    // Refresh the query list to show the new/updated query
    await fetchQueries(selectedLibraryId.value);

    // Reselect the saved query (whether new or updated)
    // Find it in the updated list
    const newlySavedQuery = queriesList.value.find(q => q['@id'] === savedQuery['@id']);
    if (newlySavedQuery) {
      selectQuery(newlySavedQuery); // This resets modified state, edit mode, etc.
    } else {
      // Fallback if not found immediately
      console.warn('Saved query not found immediately in the refreshed list. Updating state directly.');
      selectedQuery.value = savedQuery; // Update local state directly
      editedName.value = savedQuery.name;
      editedDescription.value = savedQuery.description;
      code.value = savedQuery.query;
      editedId.value = savedQuery['@id']; // Update editedId as well
      isEditingDetails.value = false; // Turn off edit mode
    }

  } catch (err: any) {
    console.error('Error saving query:', err);
    errorQueries.value = err.message || 'Failed to save query.';
    // Optionally display this error near the save button or as a notification
  } finally {
    isSaving.value = false;
  }
};


// --- Read-only Editor Setup ---
const readOnlyEditorContainer = ref<HTMLElement | null>(null);
let readOnlyEditorView: EditorView | null = null;

const setupReadOnlyEditor = () => {
  if (readOnlyEditorView) {
    readOnlyEditorView.destroy(); // Clean up previous instance
    readOnlyEditorView = null;
  }

  if (readOnlyEditorContainer.value && textResults.value !== null) {
    // Determine language based on content type (basic example)
    let languageExtension: Extension[] = []; // Add explicit type Extension[]
    if (resultContentType.value?.includes('text/turtle')) {
      languageExtension = [turtle()]; // Use the imported turtle mode directly
    } else if (resultContentType.value?.includes('application/n-triples')) {
      // Potentially use turtle mode or a generic text mode if n-triples isn't directly available
      languageExtension = [turtle()]; // Example: Reusing turtle directly
    }
    // Add more language modes as needed based on what the user installed/configured

    const startState = EditorState.create({
      doc: textResults.value,
      extensions: [
        // basicSetup, // Remove basicSetup usage
        EditorView.lineWrapping, // Wrap long lines
        EditorView.editable.of(false), // Make it read-only
        ...languageExtension, // Add the determined language mode
        // Add theme if desired: EditorView.theme({...})
      ],
    });

    readOnlyEditorView = new EditorView({
      state: startState,
      parent: readOnlyEditorContainer.value,
    });
    console.log('Read-only CodeMirror instance created/updated.');
  } else {
    console.log('Read-only editor container not ready or no text results.');
  }
};

// --- Watchers ---

// Watch for changes in relevant fields to potentially mark as modified
// Note: isQueryModified computed property handles the core logic now.
// We might still need watchers if we want immediate feedback or complex interactions.
watch([editedName, editedDescription, code], () => {
  // This watcher mainly exists to trigger reactivity if needed,
  // but the computed property `isQueryModified` is the source of truth for the button state.
  // console.log('Edit field changed');
});

// Watch selectedQuery to update edit fields (and cancel creation)
watch(selectedQuery, (newSelected) => {
    if (isCreatingQuery.value) {
      // If user selects an existing query while the 'Create New' input is open, cancel creation.
      cancelCreatingQuery();
    }
    if (newSelected) {
        editedName.value = newSelected.name;
        editedDescription.value = newSelected.description;
        // code.value is set in selectQuery
    } else {
        // If deselected (e.g., by 'New Query' flow or library change),
        // editedName might be set by finishCreatingQuery or cleared by prepareNewQueryState.
        // editedDescription is cleared by prepareNewQueryState.
        // If not creating, and deselected, clear name
        if (!isCreatingQuery.value) {
            editedName.value = '';
        }
    }
}, { immediate: false }); // Don't run immediately, let initial fetch/select handle it


// Watch for immediate code changes to set editing state (for analysis disabling)
watch(code, () => { // Removed newCode param as it's unused
  isEditingQuery.value = true;
});

// Watch for debounced code changes to trigger analysis
watch(codeForAnalysis, async (newQueryText) => {
  // Analysis starts, but keep isEditingQuery true until it finishes
  if (!newQueryText || newQueryText.trim() === '') {
    queryOutputs.value = []
    queryParameters.value = []
    errorAnalysis.value = null
    parseError.value = null
    hasParseError.value = false
    isEditingQuery.value = false // No text, so editing is 'finished'
    return
  }

  isLoadingAnalysis.value = true
  errorAnalysis.value = null
  parseError.value = null // Reset parse error
  hasParseError.value = false // Reset parse error flag
  console.log('Debounced query change detected, fetching analysis...');

  try {
    // Construct URLs using the apiUrl from settings
    const outputsUrl = `${apiUrl.value}/api/queries/detect-outputs`;
    const parametersUrl = `${apiUrl.value}/api/queries/detect-parameters`;
    console.log(`Fetching analysis from: ${outputsUrl} and ${parametersUrl}`); // Log URLs

    // Fetch outputs and parameters concurrently
    const [outputsResponse, parametersResponse] = await Promise.all([
      fetch(outputsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newQueryText })
      }),
      fetch(parametersUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newQueryText })
      })
    ]);

    // Process outputs response
    if (!outputsResponse.ok) {
      const errorText = await outputsResponse.text();
      throw new Error(`Outputs fetch error: ${outputsResponse.status} - ${errorText}`);
    }
    queryOutputs.value = await outputsResponse.json() as SparqlAnalysisResult;

    // Process parameters response
    if (!parametersResponse.ok) {
      const errorText = await parametersResponse.text();
      throw new Error(`Parameters fetch error: ${parametersResponse.status} - ${errorText}`);
    }
    queryParameters.value = await parametersResponse.json() as SparqlAnalysisResult;

  } catch (err: any) {
    console.error('Error fetching query analysis:', err);
    const errorMessage = err.message || 'Failed to fetch query analysis.';
    if (errorMessage.includes('Failed to parse SPARQL query')) {
      try {
        const errorJson = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
        parseError.value = errorJson.error || 'Failed to parse SPARQL query.';
      } catch (parseErr) {
        parseError.value = errorMessage;
      }
      hasParseError.value = true;
      errorAnalysis.value = null;
    } else {
      errorAnalysis.value = errorMessage;
      queryOutputs.value = [];
      queryParameters.value = [];
      parseError.value = null;
      hasParseError.value = false;
    }
  } finally {
    isLoadingAnalysis.value = false;
    if (!hasParseError.value) {
      isEditingQuery.value = false; // Mark editing finished only if analysis succeeded
    }
  }
}, { immediate: true }); // Run immediately on component load

// Watch for changes in the selected library ID and fetch the relevant queries
watch(selectedLibraryId, (newId, oldId) => {
  console.log(`Library selection changed from ${oldId} to: ${newId}. Fetching queries...`);
  fetchQueries(newId); // Pass the new ID to the fetch function
  // selectedQuery is cleared within fetchQueries
  // Also ensure editedName is cleared if no query becomes selected
  if (!selectedQuery.value && !isCreatingQuery.value) {
      editedName.value = '';
      editedDescription.value = '';
      editedId.value = ''; // Also clear ID
  }
  // Clear results when library changes
  results.value = null;
  textResults.value = null;
  resultContentType.value = null;
  error.value = null;
  if (readOnlyEditorView) {
      readOnlyEditorView.destroy(); // Clean up editor if library changes
      readOnlyEditorView = null;
  }
}, { immediate: true }); // Also run immediately on mount


// --- Lifecycle Hooks ---
onMounted(async () => {
  await fetchBackends();
  // Watcher below will set the default selection
});
// Watch for backends to load and set the default selection
watch(executionBackends, (newBackends) => {
  if (newBackends && newBackends.length > 0 && !selectedBackendId.value) {
    selectedBackendId.value = newBackends[0]['@id'];
    console.log(`Default execution backend set to: ${selectedBackendId.value}`);
  }
}, { immediate: true }); // Immediate check in case they load before watch is set

// TODO: Add user feedback/notifications for save success/failure
</script>
