
<template>
  <div class="flex flex-col flex-grow overflow-hidden">
    <!-- Static Header -->
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold">SPARQL Editor</h2>
      <!-- Top Right Action Buttons (New/Save/Delete/Discard) -->
      <QueryActionButtons
        :selectedLibraryId="selectedLibraryId"
        :isSaving="isSaving"
        :selectedQuery="selectedQuery"
        :isQueryModified="isQueryModified"
        :saveButtonTitle="saveButtonTitle"
        :isNameValid="isNameValid"
        :isIdValid="isIdValid"
        :hasParseError="hasParseError"
        @startCreatingQuery="startCreatingQuery"
        @saveQuery="saveQuery"
        @deleteQuery="deleteQuery"
        @discardChanges="discardChanges"
      />
    </div>

    <!-- Flex container for Editor/Results and Analysis Sidebar -->
    <div class="flex flex-grow gap-4 overflow-hidden">

      <!-- Left part: Details, Editor and Results (takes more space, e.g., 2/3) -->
      <div class="flex flex-col flex-grow overflow-y-auto" style="flex-basis: 66.66%;">
        <!-- Query Details Section (Name, ID, Description) -->
        <QueryDetailsEditor
          ref="queryDetailsEditorRef"
          :selectedQuery="selectedQuery"
          @update:name="handleNameUpdate"
          @update:description="handleDescriptionUpdate"
          @update:id="handleIdUpdate"
          @modified="handleDetailsModification"
        />
        <Codemirror
          v-model="code"
          placeholder="Enter SPARQL query..."
          :style="{ border: '1px solid #ccc' }"
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
         />
        <!-- Execute Button & Backend Selector -->
        <QueryExecutionControls
          :canExecute="canExecute"
          :isLoadingBackends="isLoadingBackends"
          :executionBackends="executionBackends"
          :errorBackends="errorBackends"
          :selectedBackendId="selectedBackendId"
          :selectedMediaType="selectedMediaType"
          :mediaTypes="mediaTypes"
          @executeQuery="executeQuery"
          @displayCurlCommandWithOptions="displayCurlCommand($event)"
          @update:selectedBackendId="selectedBackendId = $event"
          @update:selectedMediaType="selectedMediaType = $event"
        ></QueryExecutionControls>
        <!-- SPARQL Parse Error Display -->
        <div v-if="analysisSidebarRef?.parseError" class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4 text-sm" role="alert">
          <strong class="font-bold">Parse Error:</strong>
          <span class="block sm:inline whitespace-pre-wrap">{{ analysisSidebarRef?.parseError }}</span>
        </div>
        <!-- Results Display -->
        <QueryResultDisplay
          class="min-h-[150px]"
          :isLoading="isLoading"
          :error="error"
          :results="results"
          :textResults="textResults"
          :resultContentType="resultContentType"
          :resultHeaders="resultHeaders"
          :resultBindings="resultBindings"
        />
      </div> <!-- End Left part -->

      <!-- Right part: Analysis Sidebar (takes less space, e.g., 1/3) -->
      <!-- Right part: Analysis Sidebar (takes less space, e.g., 1/3) -->
      <QueryAnalysisSidebar
        ref="analysisSidebarRef"
        :code="code"
        :isEditingQuery="isEditingQuery"
        :model-value="props.queryArguments"
        @update:modelValue="handleArgumentsUpdate"
      />
    </div> <!-- End Flex container for Editor/Results and Analysis -->

     <!-- Curl Command Dialog -->
     <Dialog :open="showCurlCommand" @update:open="showCurlCommand = $event">
       <DialogContent class="sm:max-w-2xl"> <!-- Increased width -->
         <DialogHeader>
           <DialogTitle>cURL Command</DialogTitle>
           <DialogDescription>
             Use this command to execute the query from your terminal.
          </DialogDescription>
        </DialogHeader>
        <div class="my-4">
          <ReadOnlyCodeEditor :modelValue="curlCommandText" language="bash" />
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="copyCurlCommand">Copy</Button>
           <DialogClose as-child>
             <Button variant="outline">Close</Button>
           </DialogClose>
         </DialogFooter>
       </DialogContent>
     </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick, onMounted, type Ref, toRef } from 'vue'; // Ensure Ref and toRef are imported
import { Codemirror } from 'vue-codemirror';
import { sparql } from 'codemirror-lang-sparql';
import { Button } from '@/components/ui/button';
import QueryDetailsEditor from '@/components/QueryDetailsEditor.vue';
import QueryAnalysisSidebar from '@/components/QueryAnalysisSidebar.vue';
import QueryResultDisplay from '@/components/QueryResultDisplay.vue';
import QueryExecutionControls from '@/components/QueryExecutionControls.vue';
import QueryActionButtons from '@/components/QueryActionButtons.vue';
import QueryArgumentsInput from '@/components/QueryArgumentsInput.vue';
import ReadOnlyCodeEditor from '@/components/ReadOnlyCodeEditor.vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useSettings } from '@/composables/useSettings';
import { useExecutionBackendsApi, type ExecutionBackend } from '@/composables/useExecutionBackendsApi';
import mediaTypes from '@/assets/data/mediaTypes.json';
// QueryParameterGroup might still be needed for the Query type itself, but not directly for arguments input anymore
import type { Query, SparqlResults, SparqlBinding, DetectedParametersResponse } from '@/types/query'; // Import DetectedParametersResponse
import { useQueryExecution } from '@/composables/useQueryExecution';
import { useQueryPersistence } from '@/composables/useQueryPersistence';
import type QueryList from '@/components/QueryList.vue'; // Import type for dummy ref

// --- Re-define types from QueryArgumentsInput.vue (Ideally move to types/query.ts) ---
interface ArgumentValue {
  value: string;
  type: 'uri' | 'literal';
}
interface DetectedParameters {
  valuesParameters?: string[][];
  limitParameters?: string[];
  offsetParameters?: string[];
}
interface QueryArgumentsModel {
  values: Record<string, ArgumentValue[]>;
  limit: Record<string, string>;
  offset: Record<string, string>;
}
// --- End Type Definitions ---


// --- Props ---
const props = defineProps<{
  selectedLibraryId: string | null;
  selectedQueryProp: Query | null;
  // Update prop type to use the new model structure
  queryArguments: QueryArgumentsModel;
}>();

// --- Emits ---
const emit = defineEmits<{
  (e: 'queryCreated', query: Query): void
  (e: 'querySaved', query: Query): void
  (e: 'queryDeleted', queryId: string): void
  // Update emit payload type
  (e: 'update:queryArguments', args: QueryArgumentsModel): void
  (e: 'startedCreatingQuery'): void
}>();

// --- Handler for Arguments Update ---
// Update handler parameter type
const handleArgumentsUpdate = (newArgs: QueryArgumentsModel) => {
  emit('update:queryArguments', newArgs);
};

// --- Settings & APIs ---
const { apiUrl } = useSettings();
const {
  backends: executionBackends,
  loading: isLoadingBackends,
  error: errorBackends,
  fetchBackends,
} = useExecutionBackendsApi();

// --- State ---
// Selected Query and Edit State (managed internally now, initialized by prop)
const selectedQuery = ref<Query | null>(null);
const editedName = ref('');
const editedDescription = ref<string | undefined>(''); // Allow undefined
const editedId = ref('');
const isQueryDetailsModified = ref(false); // Tracks if ID field specifically is modified
const initialCode = ref(''); // Store initial code for comparison
const initialName = ref(''); // Store initial name
const initialDescription = ref<string | undefined>(''); // Store initial description

// Editor Content
const code = ref(''); // Initialized by watcher below

// Codemirror extensions
const extensions = shallowRef([sparql()]);

// Query Analysis State
const isEditingQuery = ref(false);

// Saving State
const isSaving = ref(false);

// Component Refs
const analysisSidebarRef = ref<InstanceType<typeof QueryAnalysisSidebar> | null>(null);
const queryDetailsEditorRef = ref<InstanceType<typeof QueryDetailsEditor> | null>(null);
const queryArgumentsInputRef = ref<InstanceType<typeof QueryArgumentsInput> | null>(null);
const dummyQueryListRef = ref<InstanceType<typeof QueryList> | null>(null); // Dummy ref for type compatibility

// --- Computed ---
const isNameValid = computed(() => !!editedName.value.trim());

const isIdValid = computed(() => {
  // ID is optional for new queries, always valid if empty when creating
  if (!selectedQuery.value && !editedId.value.trim()) {
    return true;
  }
  // ID validation is no longer needed here as the input field is removed
  // The ID is now managed internally or auto-generated on save.
  return true; // Always consider the ID valid from the editor's perspective
});

const hasParseError = computed(() => analysisSidebarRef.value?.hasParseError ?? false);


// --- Event Handlers for QueryDetailsEditor ---
const handleNameUpdate = (value: string) => {
  editedName.value = value;
};
const handleDescriptionUpdate = (value: string | undefined) => {
  editedDescription.value = value;
};
const handleIdUpdate = (value: string) => {
  editedId.value = value;
};
const handleDetailsModification = (isModified: boolean) => {
  // This event now only signals modification of the ID field from the child
  isQueryDetailsModified.value = isModified;
};


// --- Computed ---
const isQueryModified = computed(() => {
  if (!props.selectedLibraryId) return false;

  // Check if details (name, description, ID) have changed from their initial state
  const nameChanged = editedName.value !== initialName.value;
  const descriptionChanged = editedDescription.value !== initialDescription.value;
  const idChanged = editedId.value !== (selectedQuery.value?.['@id'] ?? ''); // Compare ID against original or empty

  // Check if code has changed
  const codeChanged = code.value !== initialCode.value;

  // Overall modification status
  return nameChanged || descriptionChanged || idChanged || codeChanged;
});

// Create a ref from the prop for the composable
const queryArgumentsRef = toRef(props, 'queryArguments');

// --- Composables ---
const {
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
} = useQueryExecution(
  selectedQuery, // Use internal selectedQuery ref
  isQueryModified,
  analysisSidebarRef,
  isLoadingBackends,
  isSaving,
  queryArgumentsRef // Pass the ref created with toRef
);

// Function to reset internal edit state (name, desc, id)
const resetEditState = (query: Query | null) => {
    editedName.value = query?.name ?? '';
    editedDescription.value = query?.description ?? undefined;
    editedId.value = query?.['@id'] ?? '';
    initialName.value = editedName.value;
    initialDescription.value = editedDescription.value;
    // Initial ID for comparison is always the one from the selectedQuery (or empty if new)
    // initialId is handled within QueryDetailsEditor now for its own comparison logic
    isQueryDetailsModified.value = false; // Reset ID modification flag
};

// Create computed ref for library ID to pass to composable
const computedLibraryId = computed(() => props.selectedLibraryId);

const prepareNewQueryState = () => {
  selectedQuery.value = null;
  const newQueryInitialCode = `SELECT * WHERE {\n  ?s ?p ?o .\n  VALUES ?p { UNDEF }\n}`;
  code.value = newQueryInitialCode;
  initialCode.value = newQueryInitialCode; // Store initial state
  results.value = null;
  textResults.value = null;
  resultContentType.value = null;
  error.value = null;

  // Reset analysis sidebar state directly (mirroring original logic)
  if (analysisSidebarRef.value) {
      analysisSidebarRef.value.queryOutputs = [];
      analysisSidebarRef.value.detectedParameters = null; // Reset to null
      analysisSidebarRef.value.currentParameters = null;
      analysisSidebarRef.value.errorAnalysis = null;
      analysisSidebarRef.value.parseError = null;
      analysisSidebarRef.value.hasParseError = false;
      analysisSidebarRef.value.parameterMode = 'Detect';
      analysisSidebarRef.value?.triggerAnalysis(code.value); // Re-analyze blank query
  }
  // Reset details editor state using its own method
  queryDetailsEditorRef.value?.prepareNewQueryState();
  isQueryDetailsModified.value = false; // Reset modification flag
  // Reset arguments by emitting the update event with the correct empty structure
  emit('update:queryArguments', { values: {}, limit: {}, offset: {} });
};

const { saveQuery: persistSaveQuery, deleteQuery: persistDeleteQuery } = useQueryPersistence(
  apiUrl,
  computedLibraryId, // Pass computed ref
  selectedQuery, // The canonical selected query state
  editedName, // Pass local refs for details
  editedDescription,
  editedId,
  code, // Pass code ref
  isSaving, // Pass saving state ref
  analysisSidebarRef, // Pass analysis sidebar ref
  // queryDetailsEditorRef removed
  dummyQueryListRef, // Pass dummy ref
  isQueryModified, // Pass overall modification computed
  prepareNewQueryState // Pass the state reset function
);

// --- Methods ---
const saveQuery = async () => {
  const isNewQuery = !selectedQuery.value; // Check if it's a new query *before* saving
  await persistSaveQuery(); // Call the composable function
  // The composable should update selectedQuery ref internally
  if (selectedQuery.value) { // Check if save was successful (selectedQuery is now populated/updated)
    // Update initial state after successful save
    initialCode.value = selectedQuery.value.query;
    resetEditState(selectedQuery.value); // Reset edit state based on the saved query
    if (isNewQuery) {
      emit('queryCreated', selectedQuery.value); // Emit specific event for creation
    } else {
      emit('querySaved', selectedQuery.value);
    }
  } else {
    console.error("Save operation failed or did not return a query.");
    // Handle error appropriately, maybe show a notification
  }
};

const deleteQuery = async () => {
  const queryToDeleteId = selectedQuery.value?.['@id'];
  if (!queryToDeleteId) return;

  await persistDeleteQuery(); // Call composable
  // The composable calls prepareNewQueryState on success, resetting the view.
  // We just need to notify the parent list.
  emit('queryDeleted', queryToDeleteId);
};

const discardChanges = () => {
  if (!isQueryModified.value) return;

  if (selectedQuery.value) {
    // Re-apply the original selected query data from the ref (which wasn't modified)
    code.value = selectedQuery.value.query; // Reset code
    initialCode.value = selectedQuery.value.query; // Reset initial code baseline
    resetEditState(selectedQuery.value); // Reset local name/desc/id refs
    // QueryDetailsEditor watcher will update its internal state based on selectedQuery prop change

    // Reset analysis sidebar based on the original query
    if (analysisSidebarRef.value) {
        // Reset analysis state directly
        analysisSidebarRef.value.queryOutputs = [];
        analysisSidebarRef.value.detectedParameters = null; // Reset to null
        analysisSidebarRef.value.errorAnalysis = null;
        analysisSidebarRef.value.parseError = null;
        analysisSidebarRef.value.hasParseError = false;
        // Set parameter mode based on original query
        if (selectedQuery.value.parameters && selectedQuery.value.parameters.length > 0) {
            analysisSidebarRef.value.parameterMode = 'Specify';
            analysisSidebarRef.value.currentParameters = selectedQuery.value.parameters;
        } else {
            analysisSidebarRef.value.parameterMode = 'Detect';
            analysisSidebarRef.value.currentParameters = null;
        }
        analysisSidebarRef.value.triggerAnalysis(code.value); // Re-analyze original code
    }
    // Clear execution results
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;
    // Reset arguments (assuming v-model handles the update)
    // Need to know how arguments were initially loaded/set to reset correctly.
    // If they came from the URL via the parent, the parent's state should be the source of truth.
    // For now, just clear them. Revisit if initial state needs to be restored.
    emit('update:queryArguments', { values: {}, limit: {}, offset: {} }); // Clear arguments on discard by emitting
  } else {
    // If it was a new query, just reset everything
    prepareNewQueryState();
  }
};


const startCreatingQuery = async () => {
  if (!props.selectedLibraryId) {
    alert('Please select a library first.'); // Or handle differently
    return;
  }
  prepareNewQueryState(); // Reset state for a new query
  emit('startedCreatingQuery'); // Notify parent to clear its selection state
  await nextTick();
  // Focus the name input - EditableDetailsDisplay handles its own focus now
  // We might need a way to trigger focus in the child if desired.
};

const saveButtonTitle = computed(() => {
  const hasParseError = analysisSidebarRef.value?.hasParseError ?? false;
  // Removed isValidUriFn check as ID input is gone

  if (!props.selectedLibraryId) return 'Select a library first';
  if (!editedName.value.trim()) return 'Query Name is required'; // Use local ref
  // Removed ID validation check
  if (hasParseError) return 'Cannot save with SPARQL parse errors'; // Check parse error from analysis sidebar
  if (!isQueryModified.value) return 'No changes to save'; // Check overall modification state
  if (isSaving.value) return 'Saving...'; // Check saving status
  return selectedQuery.value ? 'Save Changes' : 'Save New Query'; // Adjust button text
});

// --- Watchers ---
watch(code, () => {
  isEditingQuery.value = true;
});

// Watch analysis loading state
watch(() => analysisSidebarRef.value?.isLoadingAnalysis, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading && !analysisSidebarRef.value?.hasParseError) {
    isEditingQuery.value = false; // Re-enable editor after analysis (if no error)
  }
});

// Watch the incoming prop to update the internal state when the parent selects a different query
watch(() => props.selectedQueryProp, (newSelectedQuery) => {
  // Avoid infinite loops if the internal state is already aligned with the prop
  if (newSelectedQuery?.['@id'] === selectedQuery.value?.['@id']) {
      return;
  }

  if (newSelectedQuery) {
    console.log("QueryEditorView: Prop changed, updating internal state for", newSelectedQuery.name);
    selectedQuery.value = { ...newSelectedQuery }; // Clone to avoid modifying prop
    code.value = newSelectedQuery.query;
    initialCode.value = newSelectedQuery.query; // Set baseline for modification check
    resetEditState(newSelectedQuery); // Reset local edit state based on new prop

    // Reset analysis sidebar based on the new query
    if (analysisSidebarRef.value) {
        // Reset analysis state directly
        analysisSidebarRef.value.queryOutputs = [];
        analysisSidebarRef.value.detectedParameters = null; // Reset to null
        analysisSidebarRef.value.errorAnalysis = null;
        analysisSidebarRef.value.parseError = null;
        analysisSidebarRef.value.hasParseError = false;
        // Set parameter mode based on new query
        if (newSelectedQuery.parameters && newSelectedQuery.parameters.length > 0) {
            analysisSidebarRef.value.parameterMode = 'Specify';
            analysisSidebarRef.value.currentParameters = newSelectedQuery.parameters;
        } else {
            analysisSidebarRef.value.parameterMode = 'Detect';
            analysisSidebarRef.value.currentParameters = null;
        }
        analysisSidebarRef.value.triggerAnalysis(code.value); // Analyze new code
    }

    // Clear execution results
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;

    // Arguments are handled by the parent via the queryArguments prop and URL sync.
    // No need to reset them here based on the selected query's parameters.

  } else {
    // If prop becomes null (e.g., deselect or new query started by parent)
    console.log("QueryEditorView: Prop is null, preparing new query state.");
    // Only reset if the internal state isn't already null (avoids redundant resets)
    if (selectedQuery.value !== null) {
       prepareNewQueryState(); // This will also clear arguments via queryArgumentsRef.value = {}
    }
  }
}, { immediate: true, deep: true }); // Deep watch needed as parent might modify the query object


// Watch execution backends to set default
watch(executionBackends, (newBackends) => {
  if (newBackends && newBackends.length > 0 && !selectedBackendId.value) {
    selectedBackendId.value = newBackends[0]['@id'];
  }
}, { immediate: true });

// --- Lifecycle Hooks ---
onMounted(async () => {
  await fetchBackends();
  // Initial state is set by the selectedQueryProp watcher
  // Arguments are set by the parent page based on URL state
  if (!selectedQuery.value) {
      // prepareNewQueryState(); // Don't call this here, watcher handles initial state based on prop
  }
});

</script>
