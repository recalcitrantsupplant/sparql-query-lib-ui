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
        <UnifiedDetailsEditor
          ref="queryDetailsEditorRef"
          :item="selectedQuery"
          :is-creating="!selectedQuery"
          @update:name="handleNameUpdate"
          @update:description="handleDescriptionUpdate"
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
import UnifiedDetailsEditor from '@/components/UnifiedDetailsEditor.vue'; // Changed
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
import type { Query, SparqlResults, SparqlBinding, DetectedParametersResponse } from '@/types/query'; // Import DetectedParametersResponse
import { useQueryExecution } from '@/composables/useQueryExecution';
import { useQueryPersistence } from '@/composables/useQueryPersistence';
import type QueryList from '@/components/QueryList.vue'; // Import type for dummy ref

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

const props = defineProps<{
  selectedLibraryId: string | null;
  selectedQueryProp: Query | null;
  queryArguments: QueryArgumentsModel;
}>();

const emit = defineEmits<{
  (e: 'queryCreated', query: Query): void
  (e: 'querySaved', query: Query): void
  (e: 'queryDeleted', queryId: string): void
  (e: 'update:queryArguments', args: QueryArgumentsModel): void
  (e: 'startedCreatingQuery'): void
}>();

const handleArgumentsUpdate = (newArgs: QueryArgumentsModel) => {
  emit('update:queryArguments', newArgs);
};

const { apiUrl } = useSettings();
const {
  backends: executionBackends,
  loading: isLoadingBackends,
  error: errorBackends,
  fetchBackends,
} = useExecutionBackendsApi();

const selectedQuery = ref<Query | null>(null);
const editedName = ref('');
const editedDescription = ref<string | undefined>('');
const editedId = ref(''); // Retained for useQueryPersistence, though not directly edited in UI
const isQueryDetailsModified = ref(false);
const initialCode = ref('');
const initialName = ref('');
const initialDescription = ref<string | undefined>('');

const code = ref('');
const extensions = shallowRef([sparql()]);
const isEditingQuery = ref(false);
const isSaving = ref(false);

const analysisSidebarRef = ref<InstanceType<typeof QueryAnalysisSidebar> | null>(null);
const queryDetailsEditorRef = ref<InstanceType<typeof UnifiedDetailsEditor> | null>(null); // Changed
const queryArgumentsInputRef = ref<InstanceType<typeof QueryArgumentsInput> | null>(null);
const dummyQueryListRef = ref<InstanceType<typeof QueryList> | null>(null);

const isNameValid = computed(() => !!editedName.value.trim());
const isIdValid = computed(() => true); // ID is managed internally or auto-generated
const hasParseError = computed(() => analysisSidebarRef.value?.hasParseError ?? false);

const handleNameUpdate = (value: string) => {
  editedName.value = value;
};
const handleDescriptionUpdate = (value: string | undefined) => {
  editedDescription.value = value;
};
// handleIdUpdate is removed as UnifiedDetailsEditor does not emit 'update:id'

const handleDetailsModification = (isModified: boolean) => {
  isQueryDetailsModified.value = isModified;
};

// handleDetailsSave removed as UnifiedDetailsEditor no longer emits 'save'

const isQueryModified = computed(() => {
  if (!props.selectedLibraryId) return false;
  const nameChanged = editedName.value !== initialName.value;
  const descriptionChanged = editedDescription.value !== initialDescription.value;
  // ID is not directly part of this modification check anymore as it's not user-editable here
  const codeChanged = code.value !== initialCode.value;
  return nameChanged || descriptionChanged || codeChanged || isQueryDetailsModified.value;
});

const queryArgumentsRef = toRef(props, 'queryArguments');

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
  selectedQuery,
  isQueryModified,
  analysisSidebarRef,
  isLoadingBackends,
  isSaving,
  queryArgumentsRef
);

const resetEditState = (query: Query | null) => {
    editedName.value = query?.name ?? '';
    editedDescription.value = query?.description ?? undefined;
    editedId.value = query?.['@id'] ?? ''; // Still needed for persistence
    initialName.value = editedName.value;
    initialDescription.value = editedDescription.value;
    isQueryDetailsModified.value = false;
};

const computedLibraryId = computed(() => props.selectedLibraryId);

const prepareNewQueryState = () => {
  selectedQuery.value = null;
  const newQueryInitialCode = `SELECT * WHERE {\n  ?s ?p ?o .\n  VALUES ?p { UNDEF }\n}`;
  code.value = newQueryInitialCode;
  initialCode.value = newQueryInitialCode;
  results.value = null;
  textResults.value = null;
  resultContentType.value = null;
  error.value = null;

  if (analysisSidebarRef.value) {
      analysisSidebarRef.value.queryOutputs = [];
      analysisSidebarRef.value.detectedParameters = null;
      analysisSidebarRef.value.currentParameters = null;
      analysisSidebarRef.value.errorAnalysis = null;
      analysisSidebarRef.value.parseError = null;
      analysisSidebarRef.value.hasParseError = false;
      analysisSidebarRef.value.parameterMode = 'Detect';
      analysisSidebarRef.value?.triggerAnalysis(code.value);
  }
  // UnifiedDetailsEditor is controlled by :item and :is-creating props for its display state.
  // Its internal prepareNewQueryState is for its own new item state.
  // Here, we ensure parent state is reset.
  resetEditState(null); // Resets editedName, editedDescription, editedId for parent
  if (queryDetailsEditorRef.value && typeof queryDetailsEditorRef.value.prepareNewQueryState === 'function') {
    queryDetailsEditorRef.value.prepareNewQueryState(); // Tell child to also reset for new
  }
  isQueryDetailsModified.value = false;
  emit('update:queryArguments', { values: {}, limit: {}, offset: {} });
};

const { saveQuery: persistSaveQuery, deleteQuery: persistDeleteQuery } = useQueryPersistence(
  apiUrl,
  computedLibraryId,
  selectedQuery,
  editedName,
  editedDescription,
  editedId, // Pass editedId for persistence
  code,
  isSaving,
  analysisSidebarRef,
  dummyQueryListRef,
  isQueryModified,
  prepareNewQueryState
);

const saveQuery = async () => {
  const isNewQuery = !selectedQuery.value;
  // editedId will be empty for new queries, useQueryPersistence handles assigning one if needed.
  await persistSaveQuery();
  if (selectedQuery.value) {
    initialCode.value = selectedQuery.value.query;
    resetEditState(selectedQuery.value);
    if (isNewQuery) {
      emit('queryCreated', selectedQuery.value);
    } else {
      emit('querySaved', selectedQuery.value);
    }
  } else {
    console.error("Save operation failed or did not return a query.");
  }
};

const deleteQuery = async () => {
  const queryToDeleteId = selectedQuery.value?.['@id'];
  if (!queryToDeleteId) return;
  await persistDeleteQuery();
  emit('queryDeleted', queryToDeleteId);
};

const discardChanges = () => {
  if (!isQueryModified.value) return;
  if (selectedQuery.value) {
    code.value = selectedQuery.value.query;
    initialCode.value = selectedQuery.value.query;
    resetEditState(selectedQuery.value); // This will also reset editedName, editedDescription

    if (analysisSidebarRef.value) {
        analysisSidebarRef.value.queryOutputs = [];
        analysisSidebarRef.value.detectedParameters = null;
        analysisSidebarRef.value.errorAnalysis = null;
        analysisSidebarRef.value.parseError = null;
        analysisSidebarRef.value.hasParseError = false;
        if (selectedQuery.value.parameters && selectedQuery.value.parameters.length > 0) {
            analysisSidebarRef.value.parameterMode = 'Specify';
            analysisSidebarRef.value.currentParameters = selectedQuery.value.parameters;
        } else {
            analysisSidebarRef.value.parameterMode = 'Detect';
            analysisSidebarRef.value.currentParameters = null;
        }
        analysisSidebarRef.value.triggerAnalysis(code.value);
    }
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;
    emit('update:queryArguments', { values: {}, limit: {}, offset: {} });
  } else {
    prepareNewQueryState();
  }
};

const startCreatingQuery = async () => {
  if (!props.selectedLibraryId) {
    alert('Please select a library first.');
    return;
  }
  prepareNewQueryState();
  emit('startedCreatingQuery');
  await nextTick();
  // UnifiedDetailsEditor handles its own focus logic based on isCreating/isEditing
};

const saveButtonTitle = computed(() => {
  if (!props.selectedLibraryId) return 'Select a library first';
  if (!isNameValid.value) return 'Query Name is required';
  if (hasParseError.value) return 'Cannot save with SPARQL parse errors';
  if (!isQueryModified.value) return 'No changes to save';
  if (isSaving.value) return 'Saving...';
  return selectedQuery.value ? 'Save Changes' : 'Save New Query';
});

watch(code, () => {
  isEditingQuery.value = true;
});

watch(() => analysisSidebarRef.value?.isLoadingAnalysis, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading && !analysisSidebarRef.value?.hasParseError) {
    isEditingQuery.value = false;
  }
});

watch(() => props.selectedQueryProp, (newSelectedQuery) => {
  if (newSelectedQuery?.['@id'] === selectedQuery.value?.['@id'] && newSelectedQuery !== null) { // Ensure not to skip if new is null and old was also null effectively
      return;
  }

  if (newSelectedQuery) {
    console.log("QueryEditorView: Prop changed, updating internal state for", newSelectedQuery.name);
    selectedQuery.value = { ...newSelectedQuery };
    code.value = newSelectedQuery.query;
    initialCode.value = newSelectedQuery.query;
    resetEditState(newSelectedQuery);

    if (analysisSidebarRef.value) {
        analysisSidebarRef.value.queryOutputs = [];
        analysisSidebarRef.value.detectedParameters = null;
        analysisSidebarRef.value.errorAnalysis = null;
        analysisSidebarRef.value.parseError = null;
        analysisSidebarRef.value.hasParseError = false;
        if (newSelectedQuery.parameters && newSelectedQuery.parameters.length > 0) {
            analysisSidebarRef.value.parameterMode = 'Specify';
            analysisSidebarRef.value.currentParameters = newSelectedQuery.parameters;
        } else {
            analysisSidebarRef.value.parameterMode = 'Detect';
            analysisSidebarRef.value.currentParameters = null;
        }
        analysisSidebarRef.value.triggerAnalysis(code.value);
    }
    results.value = null;
    textResults.value = null;
    resultContentType.value = null;
    error.value = null;
  } else {
    console.log("QueryEditorView: Prop is null, preparing new query state.");
    if (selectedQuery.value !== null) { // Only if not already null
       prepareNewQueryState();
    }
  }
}, { immediate: true, deep: true });

watch(executionBackends, (newBackends) => {
  if (newBackends && newBackends.length > 0 && !selectedBackendId.value) {
    selectedBackendId.value = newBackends[0]['@id'];
  }
}, { immediate: true });

onMounted(async () => {
  await fetchBackends();
  // Initial state (including for new query) is set by the selectedQueryProp watcher
});

</script>
