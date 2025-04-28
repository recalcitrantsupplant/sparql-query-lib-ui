<template>
  <div class="flex flex-col flex-grow overflow-hidden">
    <!-- Confirmation Dialog -->
    <AlertDialog :open="showConfirmDialog" @update:open="handleDialogClose">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in the current query group. Do you want to save them before switching?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleConfirmDiscard">Discard</AlertDialogCancel>
          <AlertDialogAction @click="handleConfirmSave">Save Changes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Header and Action Buttons -->
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold">Query Group Canvas</h2>
      <QueryGroupActionButtons
        :selectedLibraryId="props.selectedLibraryId"
        :isSaving="isProcessingGroup"
        :selectedGroup="selectedGroup"
        :isGroupModified="isGroupModified"
        :saveButtonTitle="groupSaveButtonTitle"
        @startCreatingGroup="startCreatingGroup"
        @saveGroup="saveGroup"
        @deleteGroup="deleteGroup"
        @discardChanges="discardGroupChanges"
      />
    </div>

    <!-- Details Display (Handles its own editing state now) -->
    <EditableDetailsDisplay
      ref="detailsEditorRef"
      :item="selectedGroup"
      :is-creating="isCreatingNewGroup"
      @save="handleSaveGroupDetails"
      @cancel-create="handleCancelCreateGroup"
      @update:isDirty="handleDetailsDirtyUpdate"
      class="mb-4"
    />
    <!-- TODO: Add handling for when no group is selected (e.g., display message or creation prompt) -->

    <!-- Canvas Area -->
    <QueryGroupCanvas
      ref="canvasRef"
      :queries="queries"
      :is-loading-queries="isLoadingQueries"
      :group-data="selectedGroup"
      @update:modified="handleCanvasDirtyUpdate(true)"
      class="flex-grow"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue';
import QueryGroupActionButtons from '@/components/QueryGroupActionButtons.vue';
import EditableDetailsDisplay from '@/components/EditableDetailsDisplay.vue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import QueryGroupCanvas from '@/components/QueryGroupCanvas.vue';
import type { Query, QueryGroup, QueryGroupSaveData } from '@/types/query'; // Import Query type and QueryGroupSaveData
import { useQueryGroupPersistence } from '@/composables/useQueryGroupPersistence';
import { useQueryList } from '@/composables/useQueryList'; // Import the new composable
import { useSettings } from '@/composables/useSettings';

// --- Props ---
const props = defineProps<{
  selectedLibraryId: string | null;
  selectedGroupProp: QueryGroup | null; // Use the prop passed from parent
}>();

// --- Emits ---
const emit = defineEmits<{
  (e: 'groupCreated', group: QueryGroup): void
  (e: 'groupSaved', group: QueryGroup): void
  (e: 'groupDeleted', groupId: string): void
}>();


// --- State ---
const selectedGroup = ref<QueryGroup | null>(null);
const isCreatingNewGroup = ref(false);
const detailsAreDirty = ref(false); // Track dirty state from EditableDetailsDisplay
const canvasIsDirty = ref(false); // Track dirty state from QueryGroupCanvas
const showConfirmDialog = ref(false);
const pendingSelectedGroup = ref<QueryGroup | null>(null); // Store the group user wants to switch to
const detailsEditorRef = ref<InstanceType<typeof EditableDetailsDisplay> | null>(null); // Ref for the details editor component
const canvasRef = ref<InstanceType<typeof QueryGroupCanvas> | null>(null); // Ref for the canvas component

// Combined modified state
const isGroupModified = computed(() => detailsAreDirty.value || canvasIsDirty.value);

// --- Composables ---
const { apiUrl } = useSettings(); // Get apiUrl from settings

// Use the query list composable, passing the library ID prop reactively
const libraryIdRef = toRef(props, 'selectedLibraryId'); // Create a reactive ref from the prop
const {
  queries,
  isLoading: isLoadingQueries, // Rename to avoid conflict
  error: errorQueries,
  fetchQueries: fetchQueryList, // Rename to avoid conflict
} = useQueryList(libraryIdRef);

// Function to reset state, passed to the persistence composable
const prepareNewGroupState = (resetDirtyFlag = true) => {
  selectedGroup.value = null;
  isCreatingNewGroup.value = false;
  // isGroupModified is computed, reset individual flags
  if (resetDirtyFlag) {
    detailsAreDirty.value = false;
  }
  canvasIsDirty.value = false; // Reset canvas dirty flag
  // TODO: Reset canvas internal state if necessary (might need method on canvas)
};

const {
  isLoading: isPersistenceLoading, // Use renamed variable
  error: persistenceError, // Use renamed variable
  queryGroups, // We need the list ref for the library fallback case
  fetchQueryGroups, // Need the fetch list function
  fetchQueryGroupById, // Need the fetch single function
  saveQueryGroup: persistSaveGroup,
  deleteQueryGroup: persistDeleteGroup,
} = useQueryGroupPersistence(
  apiUrl,
  selectedGroup, // Pass the local selectedGroup ref
  prepareNewGroupState // Pass the reset function
);

// --- Computed ---
// Combine local editing state with persistence loading state
const isProcessingGroup = computed(() => isPersistenceLoading.value); // Use a combined state for UI feedback

const groupSaveButtonTitle = computed(() => {
  if (isProcessingGroup.value) return 'Processing...';
  return 'Save Actions'; // Placeholder - Review if QueryGroupActionButtons needs changes
});

// Expose selectedGroup for potential parent access or debugging (optional)
defineExpose({ selectedGroup });

// --- Methods ---
const handleSaveGroupDetails = async (details: { name: string; description: string | undefined }) => {
  console.log('QueryGroupView: Saving group details initiated', details);

  const groupDataToSave: QueryGroupSaveData = {
    '@id': selectedGroup.value?.['@id'], // Include ID only if updating
    name: details.name,
    description: details.description,
    // Get layout from canvas component
    canvasLayout: canvasRef.value?.getCanvasLayoutString() || selectedGroup.value?.canvasLayout, // Use current layout or fallback to existing if canvas not ready/modified
    // Keep existing nodes/edges/start/end for now, assuming layout is the primary change here
    // TODO: Decide if nodes/edges should also be updated based on canvas state in this save action
    nodes: selectedGroup.value?.nodes || [],
    edges: selectedGroup.value?.edges || [],
    startNodeIds: selectedGroup.value?.startNodeIds || [],
    endNodeIds: selectedGroup.value?.endNodeIds || [],
  };

  try {
    const savedGroup = await persistSaveGroup(groupDataToSave);
    if (savedGroup) {
      // Reset individual dirty flags after successful save
      detailsAreDirty.value = false;
      canvasIsDirty.value = false; // Also reset canvas dirty flag
      isCreatingNewGroup.value = false;
      if (groupDataToSave['@id']) {
        emit('groupSaved', savedGroup);
      } else {
        emit('groupCreated', savedGroup);
      }
      console.log('Group details saved successfully.');
      return savedGroup; // Return the saved group for dialog logic
    }
    return null; // Indicate save failed or wasn't needed
  } catch (error) {
    console.error("Failed to save group details:", error);
    alert(`Error saving group: ${persistenceError.value?.message || 'Unknown error'}`);
  }
};

const handleCancelCreateGroup = () => {
  console.log('QueryGroupView: Cancelling new group creation');
  prepareNewGroupState(true); // Reset state fully, including dirty flag
};

const handleDetailsDirtyUpdate = (isDirty: boolean) => {
  detailsAreDirty.value = isDirty;
  // isGroupModified is computed, no need to set it directly here
};

// Handler for canvas dirty state
const handleCanvasDirtyUpdate = (isDirty: boolean) => {
  console.log('QueryGroupView: Canvas dirty state updated:', isDirty);
  canvasIsDirty.value = isDirty;
};


const startCreatingGroup = () => {
  console.log('QueryGroupView: Starting new group creation');
  // Check combined modified state
  if (isGroupModified.value && selectedGroup.value) {
      alert("Please save or discard changes to the current group before creating a new one.");
      return;
  }

  prepareNewGroupState(false);
  isCreatingNewGroup.value = true;
};

const saveGroup = async () => {
    console.warn("Direct saveGroup call - intended for canvas-only changes.");
    if (selectedGroup.value && isGroupModified.value) {
        const currentDetails = selectedGroup.value;
        const groupDataToSave: QueryGroupSaveData = {
            '@id': currentDetails['@id'],
            name: currentDetails.name,
            description: currentDetails.description,
            // Get layout from canvas component
            canvasLayout: canvasRef.value?.getCanvasLayoutString() || currentDetails.canvasLayout, // Use current layout or fallback
            // Keep existing nodes/edges/start/end for now
            // TODO: Decide if nodes/edges should also be updated based on canvas state
            nodes: currentDetails.nodes || [],
            edges: currentDetails.edges || [],
            startNodeIds: currentDetails.startNodeIds || [],
            endNodeIds: currentDetails.endNodeIds || [],
        };
         try {
            const savedGroup = await persistSaveGroup(groupDataToSave);
            if (savedGroup) {
                // Reset individual dirty flags
                detailsAreDirty.value = false;
                canvasIsDirty.value = false;
                emit('groupSaved', savedGroup);
                console.log('Group saved (potentially canvas changes only).');
            }
        } catch (error) {
            console.error("Failed to save group (direct call):", error);
            alert(`Error saving group: ${persistenceError.value?.message || 'Unknown error'}`);
        }
    } else {
        console.log("SaveGroup call skipped: No selected group or no modifications.");
    }
};


const deleteGroup = async () => {
  const group = selectedGroup.value;
  if (!group || !group['@id'] || isProcessingGroup.value) {
    console.warn('No group selected for deletion or already processing.');
    return;
  }

  try {
    await persistDeleteGroup();
    emit('groupDeleted', group['@id']);
    console.log('Group deletion initiated successfully.');
  } catch (error) {
    console.error("QueryGroupView: Delete group failed.", error);
  }
};

const discardGroupChanges = () => {
  console.log('QueryGroupView: Discarding group changes (via button)');
  if (isCreatingNewGroup.value) {
    handleCancelCreateGroup();
  } else if (selectedGroup.value) {
    const groupId = selectedGroup.value['@id'];
    if (groupId) {
        fetchQueryGroupById(groupId).then(originalGroup => {
            if (originalGroup) {
                selectedGroup.value = { ...originalGroup };
                // Reset individual dirty flags
                detailsAreDirty.value = false;
                canvasIsDirty.value = false;
                console.log('Original group data reloaded after discard.');
            } else {
                console.error('Failed to reload original group data after discard.');
                 // Reset flags even on error
                detailsAreDirty.value = false;
                canvasIsDirty.value = false;
            }
        }).catch(err => {
             console.error('Error reloading group data:', err);
              // Reset flags even on error
             detailsAreDirty.value = false;
             canvasIsDirty.value = false;
        });
    } else {
        prepareNewGroupState(true);
    }
  }
};


// --- Confirmation Dialog Logic ---
const proceedWithGroupChange = (newGroup: QueryGroup | null) => {
  console.log('Proceeding with group change to:', newGroup?.name ?? 'null');
  selectedGroup.value = newGroup ? { ...newGroup } : null;
  pendingSelectedGroup.value = null;
  showConfirmDialog.value = false;
  // Reset individual dirty flags
  detailsAreDirty.value = false;
  canvasIsDirty.value = false;
  isCreatingNewGroup.value = false;
};

const handleConfirmSave = () => {
  console.log('Dialog: Confirm Save clicked');
  if (!detailsEditorRef.value) {
      console.error("Details editor ref not available.");
      showConfirmDialog.value = false;
      return;
  }

  const saveInitiated = detailsEditorRef.value.save();

  if (saveInitiated) {
    console.log('Save initiated in child component, proceeding with group switch.');
    proceedWithGroupChange(pendingSelectedGroup.value);
  } else {
    console.log('Save not initiated by child component (validation likely failed).');
    showConfirmDialog.value = false;
    pendingSelectedGroup.value = null;
  }
};

const handleConfirmDiscard = () => {
  console.log('Dialog: Confirm Discard clicked');
  proceedWithGroupChange(pendingSelectedGroup.value);
};

const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && pendingSelectedGroup.value) {
        console.log('Dialog closed without action, cancelling group switch.');
        pendingSelectedGroup.value = null;
    }
    showConfirmDialog.value = isOpen;
};


// --- Watchers ---
watch(() => props.selectedGroupProp, (newGroupProp, oldGroupProp) => {
  if (newGroupProp?.['@id'] === oldGroupProp?.['@id']) {
      return;
  }

  console.log('QueryGroupView: selectedGroupProp changed:', newGroupProp?.name ?? 'null');

  // Check combined modified state
  if (isGroupModified.value) {
    console.log('Unsaved changes detected (details or canvas), showing confirmation dialog.');
    pendingSelectedGroup.value = newGroupProp ? { ...newGroupProp } : null;
    showConfirmDialog.value = true;
  } else {
    proceedWithGroupChange(newGroupProp ? { ...newGroupProp } : null);
  }
});

</script>
