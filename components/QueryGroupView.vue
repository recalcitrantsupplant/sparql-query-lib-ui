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
    <UnifiedDetailsEditor
      ref="detailsEditorRef"
      :item="selectedGroup"
      :is-creating="isCreatingNewGroup"
      @update:name="selectedGroup ? selectedGroup.name = $event : null"
      @update:description="selectedGroup ? selectedGroup.description = $event : null"
      @cancel-create="handleCancelCreateGroup"
      @modified="handleDetailsModifiedUpdate"
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
import UnifiedDetailsEditor from '@/components/UnifiedDetailsEditor.vue'; // Changed
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
const detailsAreDirty = ref(false); // This now reflects the 'modified' state from UnifiedDetailsEditor
const canvasIsDirty = ref(false); // Track dirty state from QueryGroupCanvas
const showConfirmDialog = ref(false);
const pendingSelectedGroup = ref<QueryGroup | null>(null); // Store the group user wants to switch to
const detailsEditorRef = ref<InstanceType<typeof UnifiedDetailsEditor> | null>(null); // Changed
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

  let currentNodes: QueryGroup['nodes'] = selectedGroup.value?.nodes || [];
  let currentEdges: QueryGroup['edges'] = selectedGroup.value?.edges || [];
  let currentCanvasLayout: string | undefined = selectedGroup.value?.canvasLayout;

  if (canvasRef.value) {
    const flowNodes = canvasRef.value.getNodes();
    const flowEdges = canvasRef.value.getEdges();
    currentCanvasLayout = canvasRef.value.getCanvasLayoutString();

    currentNodes = flowNodes.map(flowNode => ({
      '@id': flowNode.id,
      '@type': 'QueryNode', // Ensure type is present
      queryId: flowNode.data?.queryId, // queryId is in data
      position: flowNode.position,
      label: flowNode.data?.label || flowNode.label, // Prefer data.label, fallback to node.label
      // parameterMappings and backendId would need to be merged if they exist on original nodes
      // For simplicity, if a node existed, try to find its original mappings/backendId
      // This part might need more sophisticated merging if those fields are critical and can change
      // or if nodes can be created/deleted and their full state isn't managed by canvas data.
      // For now, we assume new nodes won't have these, and existing nodes' other props are preserved
      // if not directly editable on the canvas.
      // A safer approach for existing nodes is to find the original and update only canvas-managed fields.
      parameterMappings: selectedGroup.value?.nodes?.find(n => n['@id'] === flowNode.id)?.parameterMappings,
      backendId: selectedGroup.value?.nodes?.find(n => n['@id'] === flowNode.id)?.backendId,
    }));

    currentEdges = flowEdges.map(flowEdge => {
      const existingEdge = selectedGroup.value?.edges?.find(e => e['@id'] === flowEdge.id);
      return {
        '@id': flowEdge.id,
        '@type': 'QueryEdge', // Ensure type is present
        fromNodeId: flowEdge.source,
        toNodeId: flowEdge.target,
        label: typeof flowEdge.label === 'string' ? flowEdge.label : undefined,
        mappings: existingEdge?.mappings || [], // Preserve existing mappings or default to empty for new edges
      };
    });
  }

  const groupDataToSave: QueryGroupSaveData = {
    '@id': selectedGroup.value?.['@id'], // Include ID only if updating
    name: details.name,
    description: details.description,
    canvasLayout: currentCanvasLayout,
    nodes: currentNodes,
    edges: currentEdges,
    startNodeIds: selectedGroup.value?.startNodeIds || [], // Preserve these as they are not canvas-managed
    endNodeIds: selectedGroup.value?.endNodeIds || [],   // Preserve these
  };

  try {
    const savedGroup = await persistSaveGroup(groupDataToSave);
    if (savedGroup) {
      detailsAreDirty.value = false; // Reset after successful save
      canvasIsDirty.value = false;
      isCreatingNewGroup.value = false;
      if (groupDataToSave['@id']) {
        emit('groupSaved', savedGroup);
      } else {
        emit('groupCreated', savedGroup);
      }
      console.log('Group details saved successfully.');
      return savedGroup;
    }
    return null;
  } catch (error) {
    console.error("Failed to save group details:", error);
    alert(`Error saving group: ${persistenceError.value?.message || 'Unknown error'}`);
  }
};

const handleCancelCreateGroup = () => {
  console.log('QueryGroupView: Cancelling new group creation');
  prepareNewGroupState(true); // Reset state fully, including dirty flag
};

// Renamed from handleDetailsDirtyUpdate
const handleDetailsModifiedUpdate = (isModified: boolean) => {
  detailsAreDirty.value = isModified;
};

// Handler for canvas dirty state
const handleCanvasDirtyUpdate = (isDirty: boolean) => {
  console.log('QueryGroupView: Canvas dirty state updated:', isDirty);
  canvasIsDirty.value = isDirty;
};


const startCreatingGroup = () => {
  console.log('QueryGroupView: Starting new group creation');
  if (isGroupModified.value && selectedGroup.value) {
      alert("Please save or discard changes to the current group before creating a new one.");
      return;
  }
  prepareNewGroupState(false);
  isCreatingNewGroup.value = true;
};

const saveGroup = async () => {
    console.warn("Direct saveGroup call - intended for canvas-only changes. Ensuring canvas state is captured.");
    if (selectedGroup.value && isGroupModified.value) {
        const baseDetails = selectedGroup.value; // Use selectedGroup as the base for name/desc etc.

        let currentNodes: QueryGroup['nodes'] = baseDetails.nodes || [];
        let currentEdges: QueryGroup['edges'] = baseDetails.edges || [];
        let currentCanvasLayout: string | undefined = baseDetails.canvasLayout;

        if (canvasRef.value) {
            const flowNodes = canvasRef.value.getNodes();
            const flowEdges = canvasRef.value.getEdges();
            currentCanvasLayout = canvasRef.value.getCanvasLayoutString();

            currentNodes = flowNodes.map(flowNode => ({
                '@id': flowNode.id,
                '@type': 'QueryNode',
                queryId: flowNode.data?.queryId,
                position: flowNode.position,
                label: flowNode.data?.label || flowNode.label,
                parameterMappings: baseDetails.nodes?.find(n => n['@id'] === flowNode.id)?.parameterMappings,
                backendId: baseDetails.nodes?.find(n => n['@id'] === flowNode.id)?.backendId,
            }));

            currentEdges = flowEdges.map(flowEdge => {
                const existingEdge = baseDetails.edges?.find(e => e['@id'] === flowEdge.id);
                return {
                    '@id': flowEdge.id,
                    '@type': 'QueryEdge',
                    fromNodeId: flowEdge.source,
                    toNodeId: flowEdge.target,
                    label: typeof flowEdge.label === 'string' ? flowEdge.label : undefined,
                    mappings: existingEdge?.mappings || [],
                };
            });
        }

        const groupDataToSave: QueryGroupSaveData = {
            '@id': baseDetails['@id'], // Must have @id if selectedGroup exists
            name: baseDetails.name,
            description: baseDetails.description,
            canvasLayout: currentCanvasLayout,
            nodes: currentNodes,
            edges: currentEdges,
            startNodeIds: baseDetails.startNodeIds || [],
            endNodeIds: baseDetails.endNodeIds || [],
        };

        try {
            const savedGroup = await persistSaveGroup(groupDataToSave);
            if (savedGroup) {
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
                detailsAreDirty.value = false;
                canvasIsDirty.value = false;
                console.log('Original group data reloaded after discard.');
            } else {
                console.error('Failed to reload original group data after discard.');
                detailsAreDirty.value = false;
                canvasIsDirty.value = false;
            }
        }).catch(err => {
             console.error('Error reloading group data:', err);
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
  detailsAreDirty.value = false;
  canvasIsDirty.value = false;
  isCreatingNewGroup.value = false;
};

const handleConfirmSave = async () => {
  console.log('Dialog: Confirm Save clicked');
  if (!detailsEditorRef.value) {
    console.error("Details editor ref not available.");
    showConfirmDialog.value = false;
    return;
  }

  if (detailsAreDirty.value) {
    if (selectedGroup.value) {
      // Call handleSaveGroupDetails directly with the current (updated by @update:name/desc) details
      const savedGroup = await handleSaveGroupDetails({
        name: selectedGroup.value.name,
        description: selectedGroup.value.description,
      });
      if (savedGroup) {
        // Save was successful, detailsAreDirty should be false now (set in handleSaveGroupDetails)
        proceedWithGroupChange(pendingSelectedGroup.value);
      } else {
        // Save failed, keep dialog open or handle error
        console.error("Dialog: handleSaveGroupDetails failed. Save dialog remains open or needs error handling.");
        // Optionally, close the dialog and don't switch:
        // showConfirmDialog.value = false;
        // pendingSelectedGroup.value = null;
        return; // Prevent proceeding if save failed
      }
    } else {
      console.error("Dialog: Cannot save, selectedGroup is null.");
      showConfirmDialog.value = false; // Close dialog
      return; // Don't proceed
    }
  } else {
    // No details were dirty, just proceed with the switch
    proceedWithGroupChange(pendingSelectedGroup.value);
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

  if (isGroupModified.value) {
    console.log('Unsaved changes detected (details or canvas), showing confirmation dialog.');
    pendingSelectedGroup.value = newGroupProp ? { ...newGroupProp } : null;
    showConfirmDialog.value = true;
  } else {
    proceedWithGroupChange(newGroupProp ? { ...newGroupProp } : null);
  }
});

</script>
