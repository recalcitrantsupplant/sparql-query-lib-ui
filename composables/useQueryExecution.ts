import { ref, computed, watch, nextTick, type Ref } from 'vue';
import { useSettings } from '@/composables/useSettings';
import type { Query, SparqlResults, SparqlBinding, SparqlBindingValue, QueryParameterGroup, DetectedParametersResponse, QueryArgumentsModel, ArgumentValue } from '@/types/query'; // Import types, added SparqlBindingValue and argument types
import type QueryAnalysisSidebar from '@/components/QueryAnalysisSidebar.vue'; // Import type for ref
 // Remove QueryArgumentsInput import as we now pass the arguments object directly
 // import type QueryArgumentsInput from '@/components/QueryArgumentsInput.vue';

// Define the structure for a single argument set passed in the request body
interface QueryArgumentSet {
  head: { vars: string[] };
   arguments: SparqlBinding[]; // Array of binding objects for this set
 }

// --- Helper Function to Format Arguments ---
function formatArgumentsForRequest(args: QueryArgumentsModel | null | undefined, detectedParams: DetectedParametersResponse | null | undefined): QueryArgumentSet[] | undefined {
  if (!args || !detectedParams) return undefined;

  const valueGroups = detectedParams.valuesParameters ?? [];
  const limitParams = detectedParams.limitParameters ?? [];
  const offsetParams = detectedParams.offsetParameters ?? [];

  const allValueParamNames = valueGroups.flat();

  // Filter args to only include detected parameters that have actual values provided
  const relevantValues: Record<string, ArgumentValue[]> = {};
  allValueParamNames.forEach(name => {
    // Include if the param exists in args.values and has at least one row with a non-empty value
    if (args.values && args.values[name] && args.values[name].some(v => v.value !== '')) {
      relevantValues[name] = args.values[name];
    }
  });

  const relevantLimit: Record<string, string> = {};
  limitParams.forEach(name => {
    if (args.limit && args.limit[name] !== undefined && args.limit[name] !== null && args.limit[name] !== '') {
       relevantLimit[name] = args.limit[name];
    }
  });

  const relevantOffset: Record<string, string> = {};
  offsetParams.forEach(name => {
    if (args.offset && args.offset[name] !== undefined && args.offset[name] !== null && args.offset[name] !== '') {
       relevantOffset[name] = args.offset[name];
    }
  });

  // Determine the number of binding rows needed (max length of any relevant VALUES array)
  let numBindingRows = 0;
  Object.values(relevantValues).forEach(arr => {
    numBindingRows = Math.max(numBindingRows, arr.length);
  });

  // If only LIMIT/OFFSET are present and have values, we need one binding row
  if (numBindingRows === 0 && (Object.keys(relevantLimit).length > 0 || Object.keys(relevantOffset).length > 0)) {
      numBindingRows = 1;
  }

  // If no relevant arguments provided values, return undefined
  if (numBindingRows === 0) return undefined;

  const bindings: SparqlBinding[] = [];
  // Include only parameter names that actually have provided values
  const finalParamNames = [...Object.keys(relevantValues), ...Object.keys(relevantLimit), ...Object.keys(relevantOffset)];

  if (finalParamNames.length === 0) return undefined; // Double check if all params ended up empty

  for (let i = 0; i < numBindingRows; i++) {
    const binding: SparqlBinding = {};

    // Add VALUES params for this row
    Object.entries(relevantValues).forEach(([name, values]) => {
      if (values[i] && values[i].value !== '') { // Only include if value exists and is not empty for this row
        binding[name] = {
          type: values[i].type,
          value: values[i].value,
          // Basic type detection for literals
          ...(values[i].type === 'literal' && !isNaN(Number(values[i].value)) && String(parseInt(values[i].value)) === values[i].value && { datatype: 'http://www.w3.org/2001/XMLSchema#integer' }),
          ...(values[i].type === 'literal' && !isNaN(Number(values[i].value)) && String(parseFloat(values[i].value)) === values[i].value && !Number.isInteger(Number(values[i].value)) && { datatype: 'http://www.w3.org/2001/XMLSchema#decimal' }),
          ...(values[i].type === 'literal' && (values[i].value.toLowerCase() === 'true' || values[i].value.toLowerCase() === 'false') && { datatype: 'http://www.w3.org/2001/XMLSchema#boolean' })
        };
      }
    });

    // Add LIMIT/OFFSET params (only to the first binding row)
    if (i === 0) {
        Object.entries(relevantLimit).forEach(([name, value]) => {
            binding[name] = { type: 'literal', value: value, datatype: 'http://www.w3.org/2001/XMLSchema#integer' };
        });
        Object.entries(relevantOffset).forEach(([name, value]) => {
            binding[name] = { type: 'literal', value: value, datatype: 'http://www.w3.org/2001/XMLSchema#integer' };
        });
    }

    // Only add the binding row if it contains at least one value
    if (Object.keys(binding).length > 0) {
        bindings.push(binding);
    }
  }

  // If after processing all rows, no valid bindings were created, return undefined
  if (bindings.length === 0) return undefined;

  const argumentSet: QueryArgumentSet = {
    head: { vars: finalParamNames },
    arguments: bindings
  };

  return [argumentSet]; // Return as an array containing the single set
}
// --- End Helper Function ---

export function useQueryExecution(
  selectedQuery: Ref<Query | null>,
  isQueryModified: Ref<boolean>,
  analysisSidebarRef: Ref<InstanceType<typeof QueryAnalysisSidebar> | null>,
   isLoadingBackends: Ref<boolean>,
   isSaving: Ref<boolean>,
   queryArguments: Ref<QueryArgumentsModel>, // Use the specific type
 ) {
   const { apiUrl, selectedLibraryId } = useSettings();

  // SPARQL Execution State
  const results = ref<SparqlResults | null>(null);
  const textResults = ref<string | null>(null);
  const resultContentType = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const selectedBackendId = ref<string | null>(null); // Keep backend selection here for execution
  const selectedMediaType = ref<string>('application/sparql-results+json'); // Keep media type here for execution

  // State for copy ID feedback (Moved to QueryDetailsEditor)
  // Removed copiedIdTooltipVisible
  const showCurlCommand = ref(false);
  const curlCommandText = ref('');
  const includeArgsInCurl = ref(false); // New ref to control argument inclusion

  const resultHeaders = computed(() => {
    if (!results.value?.head?.vars) return [];
    return results.value.head.vars;
  });

  const resultBindings = computed<SparqlBinding[]>(() => {
    if (!results.value?.results?.bindings) return [];
    return results.value.results.bindings;
  });

  const canExecute = computed(() => {
    // Access hasParseError and isLoadingAnalysis from the analysis sidebar component
    const hasParseError = analysisSidebarRef.value?.hasParseError ?? false;
    const isLoadingAnalysis = analysisSidebarRef.value?.isLoadingAnalysis ?? false;

    return !isLoading.value &&
           !!selectedQuery.value?.['@id'] &&
           !isQueryModified.value &&
           !!selectedBackendId.value &&
           !isLoadingBackends.value &&
           !isSaving.value &&
           !hasParseError && // Cannot execute with parse errors
           !isLoadingAnalysis; // Cannot execute while analysis is running
  });

  const curlCommand = computed(() => {
    if (!selectedQuery.value?.['@id'] || !selectedBackendId.value || !apiUrl.value) {
      return '# Select a query and backend to generate the curl command.';
    }

    const executeUrl = `${apiUrl.value}/api/execute/`;
    const argsObject = queryArguments.value; // The current bindings object
    const requestBody: { targetId: string; backendId: string; arguments?: QueryArgumentSet[] } = {
      targetId: selectedQuery.value['@id'],
       backendId: selectedBackendId.value,
     };

     // Conditionally include arguments based on the includeArgsInCurl ref
     if (includeArgsInCurl.value) {
         requestBody.arguments = formatArgumentsForRequest(queryArguments.value, analysisSidebarRef.value?.detectedParameters);
     }

    // Use --data-raw which doesn't process the data like -d does
    // Also escape single quotes within the JSON string for the shell
    const rawBody = JSON.stringify(requestBody).replace(/'/g, "'\\''");

    // Mimic the browser's working curl command more closely
    return `curl '${executeUrl}' \\
  -H 'Accept: ${selectedMediaType.value}' \\
  -H 'Content-Type: application/json' \\
  -H 'Origin: http://localhost:3001' \\
  --data-raw '${rawBody}'`; // Note: rawBody now includes arguments if present
  });

  // Update displayCurlCommand to accept options
  const displayCurlCommand = async (options: { includeArgs: boolean } = { includeArgs: false }) => {
    includeArgsInCurl.value = options.includeArgs; // Set the ref based on the option
    await nextTick(); // Ensure computed property recalculates with the new ref value
    curlCommandText.value = curlCommand.value; // Now get the recalculated value
    showCurlCommand.value = true;
    copyCurlCommand(); // Keep immediate copy for convenience
    console.log(`Generated Curl Command (includeArgs: ${options.includeArgs}):`, curlCommandText.value);
  };

  const copyCurlCommand = async () => {
    if (!curlCommandText.value) return;
    try {
      await navigator.clipboard.writeText(curlCommandText.value);
      console.log('Curl command copied to clipboard.');
    } catch (err) {
      console.error('Failed to copy curl command:', err);
      alert('Failed to copy command.');
    }
  };

  const executeQuery = async () => {
    if (!canExecute.value || !selectedQuery.value || !selectedBackendId.value) {
        console.warn('Execution conditions not met.');
        return;
    }

    isLoading.value = true;
    error.value = null;
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;

    // Define an interface for the request body using the structured argument type
    interface ExecuteRequestBody {
      targetId: string;
      backendId: string;
       arguments?: QueryArgumentSet[]; // Array of structured argument sets
     }

     // Use helper function to format arguments for the request body
     const requestBody: ExecuteRequestBody = {
       targetId: selectedQuery.value['@id'],
       backendId: selectedBackendId.value,
       arguments: formatArgumentsForRequest(queryArguments.value, analysisSidebarRef.value?.detectedParameters),
     };

    // JSON.stringify will omit the 'arguments' key if structuredArguments is undefined

    try {
      const executeUrl = `${apiUrl.value}/api/execute/`;
      console.log(`Executing stored query: ${requestBody.targetId} against backend: ${requestBody.backendId} via ${executeUrl}`);

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': selectedMediaType.value,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let detail = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          detail = errorJson.error || errorJson.message || errorText;
        } catch (e) { /* Ignore parsing error, use raw text */ }
        throw new Error(`HTTP error! status: ${response.status}, message: ${detail}`);
      }

      resultContentType.value = response.headers.get('Content-Type');
      console.log(`Response Content-Type: ${resultContentType.value}`);

      if (resultContentType.value?.includes('application/sparql-results+json') || resultContentType.value?.includes('application/json')) {
        results.value = await response.json() as SparqlResults;
        console.log('Execution successful, JSON results received.');
      } else if (resultContentType.value?.includes('text/turtle') || resultContentType.value?.includes('application/n-triples')) {
        textResults.value = await response.text();
        console.log('Execution successful, Text results received.');
        await nextTick();
      } else {
        textResults.value = await response.text();
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

  // Watch for changes in the selected library ID to clear results
  watch(selectedLibraryId, () => {
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;
  });

  // Watch for changes in selectedQuery to clear results
  watch(selectedQuery, () => {
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;
  });


  return {
    results,
    textResults,
    resultContentType,
    isLoading,
    error,
    selectedBackendId,
    selectedMediaType,
    showCurlCommand,
    curlCommandText,
    resultHeaders,
    resultBindings,
    canExecute,
    executeQuery,
    displayCurlCommand,
    copyCurlCommand,
  };
}
