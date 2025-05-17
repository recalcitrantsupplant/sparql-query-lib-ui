<template>
  <div class="flex flex-col space-y-2" style="flex-basis: 33.33%;"> <!-- Reduced space-y -->

    <!-- Parameters Box -->
    <div class="border p-2 min-h-[6rem] overflow-auto relative" :class="{ 'opacity-50 pointer-events-none': hasParseError || isEditingQuery }">
      <div class="flex justify-between items-center mb-1">
        <h3 class="font-semibold">Parameters</h3>
        <!-- Toggle Button -->
        <div class="flex text-xs border rounded overflow-hidden">
          <span
            class="px-2 py-1 cursor-pointer"
            :class="{ 'bg-blue-500 text-white': parameterMode === 'Detect', 'bg-gray-100 hover:bg-gray-200': parameterMode !== 'Detect' }"
            @click="parameterMode = 'Detect'"
          >
            Detect
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
        <div class="space-y-2 p-2">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/2" />
          <Skeleton class="h-4 w-5/6" />
        </div>
      </div>
      <!-- Analysis Error State (Show only if NOT a parse error) -->
      <div v-else-if="errorAnalysis && !hasParseError" class="text-xs text-red-600 bg-red-50 p-1 rounded">
        <strong>Error:</strong> {{ errorAnalysis }}
      </div>
      <!-- Parameter Display based on Mode -->
      <div v-else class="text-sm">
        <div v-if="parameterMode === 'Detect'">
          <!-- Display detected parameters based on the new structure -->
          <div v-if="detectedParameters && (detectedParameters.valuesParameters?.length || detectedParameters.limitParameters?.length || detectedParameters.offsetParameters?.length)" class="space-y-2 mt-1">
            <!-- VALUES Clauses -->
            <div v-if="detectedParameters.valuesParameters && detectedParameters.valuesParameters.length > 0">
              <h4 class="text-xs font-medium text-gray-600 mb-0.5">VALUES Clauses</h4>
              <div class="flex flex-col space-y-1 items-start">
                <div v-for="(group, groupIndex) in detectedParameters.valuesParameters" :key="`values-group-${groupIndex}`"
                     class="p-1 rounded bg-purple-100 text-purple-900 text-xs inline-flex flex-row space-x-0.5">
                  <div v-for="(param, paramIndex) in group" :key="`values-param-${groupIndex}-${paramIndex}`"
                       class="px-1 py-0.5 rounded bg-purple-200">
                    {{ param }}
                  </div>
                </div>
              </div>
            </div>
            <!-- LIMIT -->
            <div v-if="detectedParameters.limitParameters && detectedParameters.limitParameters.length > 0">
              <h4 class="text-xs font-medium text-gray-600 mb-0.5">LIMIT</h4>
              <div class="flex flex-wrap gap-1">
                <span v-for="(param, index) in detectedParameters.limitParameters" :key="`limit-${index}`"
                      class="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">
                  {{ param }}
                </span>
              </div>
            </div>
            <!-- OFFSET -->
            <div v-if="detectedParameters.offsetParameters && detectedParameters.offsetParameters.length > 0">
              <h4 class="text-xs font-medium text-gray-600 mb-0.5">OFFSET</h4>
              <div class="flex flex-wrap gap-1">
                <span v-for="(param, index) in detectedParameters.offsetParameters" :key="`offset-${index}`"
                      class="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-xs">
                  {{ param }}
                </span>
              </div>
            </div>
          </div>
          <!-- No parameters detected -->
          <span v-else class="text-gray-500 text-xs italic ml-1">None detected</span>
        </div>
        <div v-else-if="parameterMode === 'Specify'">
           <!-- Display structured parameters from the saved/loaded query -->
           <div v-if="currentParameters && currentParameters.length > 0">
             <div v-for="(group, groupIndex) in currentParameters" :key="groupIndex" class="mb-2 p-2 bg-gray-100 rounded">
                <div v-for="(param, paramIndex) in group.vars" :key="paramIndex" class="flex justify-between items-center mb-1 p-1 border-b last:border-b-0">
                  <span class="font-mono text-xs">{{ param.paramName }}</span>
                  <div>
                    <span v-if="param.allowedTypes && param.allowedTypes.length > 0">
                      <span v-for="type in param.allowedTypes" :key="type"
                            class="ml-1 px-1.5 py-0.5 rounded text-xs bg-green-200 text-green-800">
                        {{ type }}
                      </span>
                    </span>
                    <span v-else class="text-xs text-gray-500 italic">Any type allowed</span>
                  </div>
                </div>
             </div>
           </div>
           <div v-else class="text-gray-500 text-xs italic">
               No parameters specified for this query.
           </div>
        </div>
      </div>
    </div>

    <!-- Outputs Box -->
    <div class="border p-2 min-h-[6rem] overflow-auto relative" :class="{ 'opacity-50 pointer-events-none': hasParseError || isEditingQuery }">
      <h3 class="font-semibold">Outputs</h3> <!-- Removed mb-1 -->
      <!-- Analysis Loading State -->
       <div v-if="isLoadingAnalysis" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
         <div class="space-y-2 p-2 w-full">
           <Skeleton class="h-4 w-3/4" />
           <Skeleton class="h-4 w-1/2" />
         </div>
       </div>
      <!-- Analysis Error State (Show only if NOT a parse error) -->
      <div v-else-if="errorAnalysis && !hasParseError" class="text-xs text-red-600 bg-red-50 p-1 rounded">
        <strong>Error:</strong> {{ errorAnalysis }}
      </div>
      <!-- Outputs Results -->
      <div v-else class="text-sm">
        <span v-if="queryOutputs.length > 0" class="flex flex-wrap gap-1"> <!-- Removed mt-1 -->
          <span v-for="output in queryOutputs" :key="output" class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
            {{ output }}
          </span>
        </span>
        <span v-else class="text-gray-500 text-xs italic ml-1">None detected</span>
      </div>
    </div>

    <!-- Arguments Input Box -->
    <QueryArgumentsInput
      :parameters="parametersForInput"
      :model-value="props.modelValue"
      @update:modelValue="handleArgumentsUpdate"
      :class="{ 'opacity-50 pointer-events-none': hasParseError || isEditingQuery }"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type Ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useSettings } from '@/composables/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import QueryArgumentsInput from '@/components/QueryArgumentsInput.vue'; // Import the arguments component

// --- Types ---
// Re-define types needed for props (Ideally move to types/query.ts)
interface ArgumentValue {
  value: string;
  type: 'uri' | 'literal';
}
interface QueryArgumentsModel {
  values: Record<string, ArgumentValue[]>;
  limit: Record<string, string>;
  offset: Record<string, string>;
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

type SparqlAnalysisResult = string[];

// Define the new structure for the detected parameters response
interface DetectedParametersResponse {
  valuesParameters?: string[][];
  limitParameters?: string[];
  offsetParameters?: string[];
}

// --- Props ---
const props = defineProps<{
  code: string;
  isEditingQuery: boolean;
  // Props for QueryArgumentsInput
  // parameters: DetectedParametersResponse | null; // Removed - Sidebar fetches its own
  modelValue: QueryArgumentsModel; // Use the re-defined interface
}>();

// --- Emits ---
const emit = defineEmits<{
  // Emit for QueryArgumentsInput
  (e: 'update:modelValue', args: QueryArgumentsModel): void
}>();

// --- Settings & APIs ---
const { apiUrl } = useSettings();

// --- Handler for Arguments Update ---
const handleArgumentsUpdate = (newArgs: QueryArgumentsModel) => {
  emit('update:modelValue', newArgs);
};

// --- State ---
const parameterMode = ref<'Detect' | 'Specify'>('Detect');
const queryOutputs = ref<string[]>([]);
// Update detectedParameters to use the new interface and initialize to null
const detectedParameters = ref<DetectedParametersResponse | null>(null);
const isLoadingAnalysis = ref(false);
const errorAnalysis = ref<string | null>(null);
const parseError = ref<string | null>(null);
const hasParseError = ref(false);
const currentParameters = ref<QueryParameterGroup[] | null>(null);

// --- Methods ---
const triggerAnalysis = async (queryText: string) => {
  if (!queryText || queryText.trim() === '') {
    queryOutputs.value = [];
    detectedParameters.value = null; // Reset to null
    errorAnalysis.value = null;
    parseError.value = null;
    hasParseError.value = false;
    isLoadingAnalysis.value = false; // Ensure loading is false if query is empty
    return;
  }

  isLoadingAnalysis.value = true;
  errorAnalysis.value = null;
  parseError.value = null;
  hasParseError.value = false;
  console.log('Triggering analysis...');

  try {
    const outputsUrl = `${apiUrl.value}/api/queries/detect-outputs`;
    const parametersUrl = `${apiUrl.value}/api/queries/detect-parameters`;
    console.log(`Fetching analysis from: ${outputsUrl} and ${parametersUrl}`);

    const [outputsResponse, parametersResponse] = await Promise.all([
      fetch(outputsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }) // Use the passed queryText
      }),
      fetch(parametersUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }) // Use the passed queryText
      })
    ]);

    if (!outputsResponse.ok) {
      const errorText = await outputsResponse.text();
      throw new Error(`Outputs fetch error: ${outputsResponse.status} - ${errorText}`);
    }
    queryOutputs.value = await outputsResponse.json() as SparqlAnalysisResult;

    if (!parametersResponse.ok) {
      const errorText = await parametersResponse.text();
      throw new Error(`Parameters fetch error: ${parametersResponse.status} - ${errorText}`);
    }
    // Parse the full JSON response according to the new interface
    detectedParameters.value = await parametersResponse.json() as DetectedParametersResponse;

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
      detectedParameters.value = null; // Reset to null on error
      parseError.value = null;
      hasParseError.value = false;
    }
  } finally {
    isLoadingAnalysis.value = false;
  }
};

// Debounced code for analysis
const codeForAnalysis = refDebounced(computed(() => props.code), 300);

// --- Computed ---
// Ensure parametersForInput provides a valid default for QueryArgumentsInput
const parametersForInput = computed<DetectedParametersResponse>(() => {
  return detectedParameters.value ?? {
    valuesParameters: [],
    limitParameters: [],
    offsetParameters: []
  };
});

// --- Watchers ---
watch(codeForAnalysis, (newQueryText) => {
  // Call the analysis function when debounced code changes
  triggerAnalysis(newQueryText);
}, { immediate: true });

// Watch for changes in currentParameters (set by parent when selecting a query)
watch(() => props.isEditingQuery, (isEditing) => {
  // When editing starts, analysis is disabled.
  // When editing finishes (and no parse error), analysis re-enables and watcher above triggers.
  // We don't need to do anything specific here, the template binding handles the opacity/pointer-events.
});

// Expose analysis state and methods needed by parent
defineExpose({
  parseError,
  hasParseError,
  isLoadingAnalysis,
  errorAnalysis,
  queryOutputs,
  detectedParameters,
  currentParameters,
  parameterMode, // Expose parameterMode if parent needs to read it
  triggerAnalysis, // Expose the analysis trigger function
});
</script>
