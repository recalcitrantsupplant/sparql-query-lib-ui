<template>
  <div class="flex h-screen">
    <!-- Combined Left Panel: Libraries and Queries -->
    <div class="w-1/4 border-r flex flex-col">
      <!-- Libraries Panel (now takes full width of this column) -->
      <LibrariesPanel />

      <!-- Divider (optional, for visual separation) -->
      <hr class="my-4 border-gray-300">

      <!-- Resource List Section (Conditional based on viewMode) -->
      <ResourceList
        v-if="viewMode === 'query'"
        ref="queryResourceListRef"
        title="Queries"
        resourceType="query"
        :selectedItem="selectedQuery"
        @selectItem="handleSelectItem"
        @items-loaded="handleQueryItemsLoaded"
        class="flex-grow overflow-hidden"
      />
      <ResourceList
        v-else-if="viewMode === 'group'"
        ref="groupResourceListRef"
        title="Query Groups"
        resourceType="queryGroup"
        :selectedItem="selectedQueryGroup"
        @selectItem="handleSelectItem"
        @items-loaded="handleGroupItemsLoaded"
        class="flex-grow overflow-hidden"
      />
    </div>

    <!-- Right Content Area: Editor, Analysis, and Results -->
    <div class="w-3/4 p-4 flex flex-col">
      <!-- View Mode Toggle -->
      <Tabs :model-value="viewMode" class="mb-4" @update:model-value="viewMode = $event as 'query' | 'group'">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="query">
            Query Editor
          </TabsTrigger>
          <TabsTrigger value="group">
            Query Group Canvas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <!-- Query Editor View (Now uses the extracted component) -->
      <QueryEditorView
        v-if="viewMode === 'query'"
        :selected-library-id="selectedLibraryId"
        :selected-query-prop="selectedQuery"
        v-model:query-arguments="queryArguments"
        @query-created="handleQueryCreatedOrSaved"
        @query-saved="handleQueryCreatedOrSaved"
        @query-deleted="handleQueryDeleted"
        @startedCreatingQuery="handleStartCreatingQuery"
        class="flex flex-col flex-grow overflow-hidden"
      />

      <!-- Query Group Canvas View (Now uses the extracted component) -->
      <QueryGroupView
        v-else-if="viewMode === 'group'"
        :selected-library-id="selectedLibraryId"
        :selected-group-prop="selectedQueryGroup"
        @group-created="handleGroupCreatedOrSaved"
        @group-saved="handleGroupCreatedOrSaved"
        @group-deleted="handleGroupDeleted"
        class="flex flex-col flex-grow overflow-hidden"
      />
      <!-- TODO: Implement event handlers -->

    </div> <!-- End Right Content Area -->

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
import { ref, computed, watch, onMounted, type Ref, nextTick } from 'vue';
import { useRoute } from 'vue-router'; // Re-add useRoute
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button'; // Keep Button (used in Dialog)
// Removed QueryDetailsEditor, Input, Textarea, Select imports (moved or unused)
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel, // Keep Select imports if used elsewhere, otherwise remove
} from '@/components/ui/select'; // Keep Select imports if used elsewhere, otherwise remove
import LibrariesPanel from '@/components/LibrariesPanel.vue'; // Keep
import { useLibrariesApi, type Library } from '@/composables/useLibrariesApi'; // Import library API
import ResourceList from '@/components/ResourceList.vue'; // Import the new reusable list
import QueryGroupActionButtons from '@/components/QueryGroupActionButtons.vue'; // Keep

// import QueryGroupDetailsDisplay from '@/components/QueryGroupDetailsDisplay.vue'; // Removed - Handled by EditableDetailsDisplay within QueryGroupView/QueryDetailsEditor
import QueryGroupCanvas from '@/components/QueryGroupCanvas.vue'; // Keep (Used within QueryGroupView)
import QueryEditorView from '@/components/QueryEditorView.vue'; // Keep
import QueryGroupView from '@/components/QueryGroupView.vue'; // Import the new group view component
import {
  Dialog, // Keep Dialog imports (used for Curl, maybe group later?)
  DialogContent, // Keep
  DialogDescription, // Keep
  DialogFooter, // Keep
  DialogHeader, // Keep
  DialogTitle, // Keep
  DialogTrigger, // Keep (if used)
  DialogClose, // Keep
} from '@/components/ui/dialog';
import ReadOnlyCodeEditor from '@/components/ReadOnlyCodeEditor.vue'; // Keep (used in Dialog)
import { useSettings } from '@/composables/useSettings'; // Keep
import { useUrlStateSync } from '@/composables/useUrlStateSync'; // Import the new composable
import { useExecutionBackendsApi, type ExecutionBackend } from '@/composables/useExecutionBackendsApi'; // Keep (might be needed for group view?) - Revisit if not needed
import mediaTypes from '@/assets/data/mediaTypes.json'; // Keep (might be needed for group view?) - Revisit if not needed
// Consolidated type imports
// Removed useQueryExecution, useQueryPersistence (moved)
// Removed useQueryGroupPersistence (moved to QueryGroupView)
import type { Query, QueryGroup, ResourceItem, QueryArgumentsModel } from '@/types/query'; // Import ResourceItem and QueryArgumentsModel from types/query


// --- View Mode ---
const viewMode = ref<'query' | 'group'>('query');


// --- Router ---
const route = useRoute(); // Get route instance


// --- Settings & APIs ---
const { apiUrl, selectedLibraryId } = useSettings(); // Keep settings

// Keep execution backends if needed for group view, otherwise remove fetchBackends call
const {
  backends: executionBackends,
  loading: isLoadingBackends,
  error: errorBackends,
  fetchBackends,
} = useExecutionBackendsApi();


// --- State ---
// Selected Query State (passed to QueryEditorView)
const selectedQuery = ref<Query | null>(null);
const selectedQueryGroup = ref<QueryGroup | null>(null); // Add state for selected group
const queryArguments = ref<QueryArgumentsModel>({ values: {}, limit: {}, offset: {} }); // Add state for query arguments

// --- Libraries API ---
// Fetch libraries to allow selecting the first one if none specified in URL
const { libraries, loading: isLoadingLibraries, error: errorLibraries, fetchLibraries } = useLibrariesApi();

// --- URL State Sync ---
// Use the composable, passing the necessary refs
const {
  initialLibraryIdFromUrl,
  initialQueryIdFromUrl,
  initialGroupIdFromUrl, // Get initial group ID
  initialArgumentsFromUrl
} = useUrlStateSync({
  selectedQuery,
  selectedQueryGroup, // Pass the selected group ref
  viewMode,
  queryArguments
});


// --- State (Continued) ---
// Resource List Refs
const queryResourceListRef = ref<InstanceType<typeof ResourceList> | null>(null); // Use ResourceList type and rename
const groupResourceListRef = ref<InstanceType<typeof ResourceList> | null>(null); // Add ref for group list

// Removed Query Group State (moved to QueryGroupView)
// const selectedGroup = ref<QueryGroup | null>(null);
// const isSavingGroup = ref(false);
// const isGroupModified = ref(false);
// const isEditingGroupDetails = ref(false);
// const queryGroupDetailsEditorRef = ref<InstanceType<typeof QueryGroupDetailsEditor> | null>(null);

// State for Curl Dialog (Keep for now, might be removed if only used by QueryEditorView)
const showCurlCommand = ref(false); // TODO: Re-evaluate if Curl Dialog is needed at this level
const curlCommandText = ref('');


// --- Computed ---
// Removed isQueryModified, saveButtonTitle (moved)
// Removed groupSaveButtonTitle (moved)


// --- Methods ---

// Handle item selection from ResourceList component
const handleSelectItem = (item: Query | QueryGroup | null) => {
  if (viewMode.value === 'query') {
    console.log(`Page: Selected query: ${item?.name ?? 'none'}`);
    selectedQuery.value = item as Query | null;
    // QueryEditorView will handle internal state updates via watcher
  } else if (viewMode.value === 'group') {
    console.log(`Page: Selected group: ${item?.name ?? 'none'}`);
    selectedQueryGroup.value = item as QueryGroup | null;
    // TODO: Pass selectedQueryGroup to QueryGroupView if needed
  }
};

// Handler for when the query resource list finishes loading items
const handleQueryItemsLoaded = (items: Query[]) => {
  console.log(`Page: Query items loaded (${items.length}). Current selection: ${selectedQuery.value?.['@id'] ?? 'none'}. Initial URL queryId: ${initialQueryIdFromUrl.value}`);

  let querySelected = false;

  // Priority 0: Preserve current selection if it's valid and exists in the new list
  if (viewMode.value === 'query' && selectedQuery.value) {
    const currentSelectionInNewList = items.find(q => q['@id'] === selectedQuery.value?.['@id']);
    if (currentSelectionInNewList) {
      console.log(`Page: Preserving currently selected query: ${selectedQuery.value.name} (${selectedQuery.value['@id']}) as it exists in the new list.`);
      // Ensure the instance is from the new list if properties might have changed, though often not strictly necessary if only ID is used for selection.
      // selectedQuery.value = currentSelectionInNewList; // Uncomment if full object refresh is desired
      querySelected = true;
    } else {
      console.log(`Page: Previously selected query ${selectedQuery.value['@id']} not found in the new list. Will attempt other selection logic.`);
      // The existing selectedQuery.value will be cleared later if no other selection logic applies.
    }
  }

  // Priority 1: Select query from URL if specified and found, AND no valid query is already selected by Priority 0
  if (viewMode.value === 'query' && !querySelected && initialQueryIdFromUrl.value && items && items.length > 0) {
    const queryFromUrl = items.find(q => q['@id'] === initialQueryIdFromUrl.value);
    if (queryFromUrl) {
      console.log(`Page: Selecting query from URL QSA: ${queryFromUrl.name} (${queryFromUrl['@id']})`);
      selectedQuery.value = queryFromUrl;
      querySelected = true;
    } else {
      console.warn(`Page: Query ID ${initialQueryIdFromUrl.value} from URL QSA not found in loaded items for library ${selectedLibraryId.value}.`);
    }
  }

  // Priority 2: Select first query as default if no query selected by P0 or P1
  if (viewMode.value === 'query' && !querySelected && items && items.length > 0) {
    console.log(`Page: No query selected yet or previous/URL selection invalid. Auto-selecting first query: ${items[0].name}`);
    selectedQuery.value = items[0];
    querySelected = true;
  }

  // If still no query selected after all attempts (e.g., empty list), ensure selectedQuery is null
  if (viewMode.value === 'query' && !querySelected) {
      console.log(`Page: No query could be selected after loading items. Setting selectedQuery to null.`);
      selectedQuery.value = null;
  }

  // The initialQueryIdFromUrl flag is primarily managed by the watcher on selectedQuery.value?.['@id']
  // to ensure arguments are handled correctly on initial load vs. subsequent manual selections.
};

// Handler for when the group resource list finishes loading items
const handleGroupItemsLoaded = (items: QueryGroup[]) => {
  console.log(`Page: Group items loaded (${items.length}). Current selection: ${selectedQueryGroup.value?.['@id'] ?? 'none'}. Initial URL groupId: ${initialGroupIdFromUrl.value}`);

  let groupSelected = false;
  // Priority 1: Select group from URL if specified and found
  if (viewMode.value === 'group' && initialGroupIdFromUrl.value && items && items.length > 0) {
    const groupFromUrl = items.find(g => g['@id'] === initialGroupIdFromUrl.value);
    if (groupFromUrl) {
      console.log(`Page: Selecting group from URL QSA: ${groupFromUrl.name} (${groupFromUrl['@id']})`);
      selectedQueryGroup.value = groupFromUrl;
      groupSelected = true;
    } else {
      console.warn(`Page: Group ID ${initialGroupIdFromUrl.value} from URL QSA not found in loaded items for library ${selectedLibraryId.value}.`);
      // Clear the initial ID ref if the group wasn't found, so we fall back to default selection
      initialGroupIdFromUrl.value = null;
    }
  }

  // Priority 2: Select first group as default if none specified in URL and none already selected
  if (viewMode.value === 'group' && !groupSelected && items && items.length > 0 && !selectedQueryGroup.value) {
    console.log(`Page: No group specified in URL or found. Auto-selecting first group: ${items[0].name}`);
    selectedQueryGroup.value = items[0];
    groupSelected = true; // Mark as selected
  }

  // If still no group selected (e.g., empty list), ensure selectedQueryGroup is null
  if (viewMode.value === 'group' && !groupSelected) {
      selectedQueryGroup.value = null;
  }

  // Clear the initial ID ref after attempting selection, its purpose is served for this load cycle.
  // Do this even if a group *was* selected from the URL, to prevent re-selection issues if the user navigates away and back.
  if (initialGroupIdFromUrl.value) {
      initialGroupIdFromUrl.value = null;
  }

  // Selection attempt complete.
};

// Removed prepareNewQueryState, saveQuery, deleteQuery, discardChanges, startCreatingQuery (moved)
// Removed handleSaveGroupDetails, startCreatingGroup, saveGroup, deleteGroup, discardGroupChanges (moved)

// Method to handle Curl command dialog (Keep for now)
// TODO: Determine if Curl dialog should be moved into QueryEditorView or triggered via events
const copyCurlCommand = () => {
  navigator.clipboard.writeText(curlCommandText.value)
    .then(() => { console.log('Page: Curl command copied!'); /* TODO: Add user feedback */ }) // Keep console log for now
    .catch(err => { console.error('Page: Failed to copy curl command:', err); }); // Keep console log for now
};

// Methods to handle events from QueryEditorView (Keep)
const handleStartCreatingQuery = () => {
  console.log("Page: Start creating query event received. Clearing selection.");
  selectedQuery.value = null;
};

const handleQueryCreatedOrSaved = (query: Query) => {
  console.log(`Page: Query ${query.name} created/saved. Updating selection.`);
  selectedQuery.value = query; // Ensure the parent page's selectedQuery is updated immediately
  // Refresh the query resource list
  queryResourceListRef.value?.fetchItems(selectedLibraryId.value);
  // The ResourceList will refresh, but the selection is already up-to-date.
};

const handleQueryDeleted = (queryId: string) => {
  console.log(`Page: Query ${queryId} deleted.`);
  // Explicitly clear the selection *before* refreshing the list
  selectedQuery.value = null;
  // Refresh the query resource list
  queryResourceListRef.value?.fetchItems(selectedLibraryId.value);
};

// Handle group created/saved events from QueryGroupView
const handleGroupCreatedOrSaved = (group: QueryGroup) => {
  console.log(`Page: Group ${group.name} created/saved.`);
  // Update the selected group ref *before* refreshing the list
  // This ensures the state is consistent when the list reloads and URL sync runs.
  selectedQueryGroup.value = group;
  // Refresh the group resource list
  groupResourceListRef.value?.fetchItems(selectedLibraryId.value);
  // The list component will handle highlighting the item based on the updated selectedQueryGroup.value
};

// Handle group deleted events from QueryGroupView
const handleGroupDeleted = (groupId: string) => {
  console.log(`Page: Group ${groupId} deleted.`);
  // Explicitly clear the selection *before* refreshing the list
  selectedQueryGroup.value = null;
  // Refresh the group resource list
  groupResourceListRef.value?.fetchItems(selectedLibraryId.value);
};


// --- Watchers ---

// Watch for changes in the selected library ID
watch(selectedLibraryId, (newId, oldId) => {
  console.log(`Page: Library selection changed from ${oldId} to: ${newId}.`);
  if (newId !== oldId) {
    selectedQuery.value = null;
    selectedQueryGroup.value = null;
    queryArguments.value = { values: {}, limit: {}, offset: {} }; // Clear arguments when library changes
    // Clear initial IDs from URL state sync when library changes
    initialQueryIdFromUrl.value = null;
    initialGroupIdFromUrl.value = null;
  }
});

// Watch for changes in the selected query ID
watch(() => selectedQuery.value?.['@id'], (newQueryId, oldQueryId) => {
  console.log(`Page: Selected query ID changed from ${oldQueryId} to ${newQueryId}`);

  // This watcher reacts when the selected query changes.
  // Its main job now is to clear arguments when the user *manually* selects a different query
  // *after* the initial page load state has been established.
  // The initial arguments are set in onMounted based on initialArgumentsFromUrl.
  // We only clear arguments here if the query changes *after* the initial load
  // AND the change wasn't triggered by the initial URL parameters.
  if (newQueryId !== oldQueryId) {
    // Check if this change corresponds to the initial query ID loaded from the URL.
    // If initialQueryIdFromUrl still holds a value and it matches the newQueryId,
    // it means this watcher is firing as part of the initial load sequence.
    // In this case, we *don't* clear the arguments, as they were just set in onMounted.
    // We also clear the initialQueryIdFromUrl flag now, as its purpose is fulfilled.
    if (initialQueryIdFromUrl.value && newQueryId === initialQueryIdFromUrl.value) {
      console.log(`Page Watcher: Initial query selection (${newQueryId}) detected. Preserving arguments set in onMounted.`);
      initialQueryIdFromUrl.value = null; // Clear the flag, initial load complete for query ID.
    } else {
      // If the newQueryId doesn't match the initial URL ID (or if the flag is already null),
      // it means this is a subsequent, manual query selection by the user.
      // Clear the arguments for the newly selected query.
      console.log(`Page Watcher: Manual query selection changed to ${newQueryId}. Clearing arguments.`);
      queryArguments.value = { values: {}, limit: {}, offset: {} };
      // Ensure the initial ID flag is cleared if it wasn't already (edge case)
      if (initialQueryIdFromUrl.value) initialQueryIdFromUrl.value = null;
    }
  }
});

// Watch for changes in view mode
watch(viewMode, (newMode, oldMode) => {
  console.log(`Page: View mode changed from ${oldMode} to ${newMode}`);
  if (newMode !== 'query') {
    console.log("Page: Clearing query arguments because view mode is not 'query'.");
    queryArguments.value = { values: {}, limit: {}, offset: {} }; // Clear arguments when switching away from query view
  }
  // When switching *to* query view, arguments might be loaded from URL by useUrlStateSync
  // or remain empty if no specific query/args are in the URL.

  // When switching *to* group view, ensure the group list fetches its items.
  // The `@items-loaded` event handler (`handleGroupItemsLoaded`) will then
  // correctly select the initial group based on the URL or the first item.
  if (newMode === 'group' && groupResourceListRef.value && selectedLibraryId.value) {
      console.log("Page: Switched to group view. Triggering fetchItems for group list.");
      // Calling fetchItems ensures the list is populated and triggers @items-loaded.
      // ResourceList might internally optimize if data is already fresh,
      // but calling it guarantees the selection logic runs.
      groupResourceListRef.value.fetchItems(selectedLibraryId.value);
  }
});


// --- Lifecycle Hooks ---
onMounted(async () => {
  console.log("Page: --- Mounted ---");
  // 1. Fetch libraries first
  await fetchLibraries();
  console.log(`Page: Libraries fetched. Found: ${libraries.value?.length ?? 0}`);

  // 2. Determine initial library selection
  if (initialLibraryIdFromUrl.value && libraries.value?.some(lib => lib['@id'] === initialLibraryIdFromUrl.value)) {
    // Priority 1: Use library ID from URL if it exists and is valid
    console.log(`Page: Setting selected library from URL QSA: ${initialLibraryIdFromUrl.value}`);
    selectedLibraryId.value = initialLibraryIdFromUrl.value;
  } else if (libraries.value && libraries.value.length > 0) {
    // Priority 2: Use first library as default if none specified/valid in URL
    console.log(`Page: No valid library in URL QSA. Selecting first library: ${libraries.value[0]['@id']}`);
    selectedLibraryId.value = libraries.value[0]['@id'];
  } else {
    console.warn("Page: No libraries loaded and none specified in URL. Cannot select a library.");
    // selectedLibraryId remains null, ResourceList will show empty state
  }

  // 3. Fetch execution backends (can happen concurrently or after library selection)
  await fetchBackends();

  // 4. Set initial arguments AFTER library/query selection logic might have run.
  // useUrlStateSync determined initialArgumentsFromUrl during its mount.
  // We apply it here. The watcher logic above is designed to prevent this
  // from being immediately cleared if it corresponds to the initial query selection.
  queryArguments.value = initialArgumentsFromUrl.value ?? { values: {}, limit: {}, offset: {} };
  console.log("Page: Set initial query arguments based on useUrlStateSync result:", JSON.parse(JSON.stringify(queryArguments.value)));

  // 5. Resource list fetching (both query and group) is triggered by the watcher
  //    on selectedLibraryId inside the ResourceList component itself.
  //    The respective handleXItemsLoaded methods will handle initial selection based on URL/defaults.

  // 6. Determine initial view mode based on URL parameters
  if (initialGroupIdFromUrl.value && !initialQueryIdFromUrl.value) {
    // If only groupId is present, default to group view
    console.log("Page: Initial groupId found in URL, setting viewMode to 'group'.");
    viewMode.value = 'group';
  } else {
    // Otherwise, default to query view (handles cases with queryId, both, or neither)
    console.log("Page: Defaulting viewMode to 'query'.");
    viewMode.value = 'query';
  }

  console.log("Page: --- Mount Complete ---");
});

</script>
