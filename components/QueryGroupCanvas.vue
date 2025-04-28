<template>
  <div class="flex-grow border rounded bg-gray-100 h-full relative"> <!-- Added relative positioning -->
    <!-- Pass the custom node types to VueFlow -->
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      fit-view-on-init
      @edge-click="onEdgeClick"
      :elements-selectable="true" 
      :edges-updatable="true"
    >
      <!-- Use slot to customize node rendering and attach event listener -->
      <!-- Spread all nodeProps to ensure compatibility -->
      <template #node-queryNode="nodeProps">
        <QueryCanvasNode v-bind="nodeProps" @assign-query="handleAssignQuery" />
      </template>

      <Background />
      <Controls />

      <!-- Add Node Button Container -->
      <div class="absolute top-16 left-4 z-10 flex flex-col space-y-2">
         <Button size="sm" @click="handleAddNode">Add Node</Button>
         <!-- TODO: Add Edge Button/Mode if needed -->
      </div>
    </VueFlow>

    <!-- Query Selection Dialog -->
    <!-- <QuerySelectionDialog
      :show="showQuerySelectionDialog"
      :queries="props.queries"
      :is-loading="props.isLoadingQueries"
      @select="handleQuerySelected"
      @close="closeDialog"
    /> -->
    <Dialog :open="showQuerySelectionDialog" @update:open="showQuerySelectionDialog = $event">
      <!-- Apply height, flex, and responsive max-width -->
      <DialogContent class="h-[75vh] flex flex-col sm:max-w-[75vw]">
        <DialogHeader>
          <DialogTitle>Assign Query to Node {{ nodeIdToAssign }}</DialogTitle>
          <DialogDescription>
            Filter the list and select a query to assign it to the selected node. Click a row to select.
          </DialogDescription>
        </DialogHeader>
        <!-- Add Filter Input -->
        <div class="py-2">
          <Input
            ref="filterInputRef"
            v-model="filterText"
            placeholder="Filter by name, description, or ID..."
            class="max-w-full"
          />
        </div>
        <!-- Add Table - Make it grow and scroll -->
        <div class="flex-grow border rounded-md overflow-y-auto relative min-h-0"> <!-- Added min-h-0 -->
          <Table>
            <!-- Make header sticky -->
            <TableHeader class="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead class="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead class="w-[100px]">Type</TableHead>
                <TableHead>Params</TableHead>
                <TableHead>Outputs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="props.isLoadingQueries">
                <TableRow>
                  <TableCell :colspan="6"> {/* Updated colspan */}
                    <div class="flex items-center justify-center p-4">Loading queries...</div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="filteredQueries.length === 0">
                 <TableRow>
                  <TableCell :colspan="6">
                    <div class="flex items-center justify-center p-4">
                      {{ filterText ? 'No queries match your filter.' : 'No queries available.' }}
                    </div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow
                  v-for="query in filteredQueries"
                  :key="query['@id']"
                  @click="handleRowClick(query)"
                  class="cursor-pointer hover:bg-muted/50"
                  :class="{ 'bg-muted': selectedQueryFromTable && selectedQueryFromTable['@id'] === query['@id'] }"
                >
                  <TableCell class="font-mono text-xs">{{ formatShortId(query['@id']) }}</TableCell>
                  <TableCell class="font-medium">{{ query.name || 'Unnamed Query' }}</TableCell>
                  <TableCell>{{ query.description }}</TableCell>
                  <TableCell class="text-xs">{{ query.queryType }}</TableCell>
                  <TableCell class="text-xs">{{ formatParams(query.parameters) }}</TableCell>
                  <TableCell class="text-xs">{{ formatOutputs(query.outputVars) }}</TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="secondary" @click="closeDialog">
              Cancel
            </Button>
          </DialogClose>
          <!-- Update disabled condition -->
          <Button type="button" @click="confirmQuerySelection" :disabled="!selectedQueryFromTable">
            Assign Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edge Edit Dialog -->
    <Dialog :open="showEdgeEditDialog" @update:open="showEdgeEditDialog = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Edge Label</DialogTitle>
          <DialogDescription>
            Update the label for the selected edge (ID: {{ formatShortId(edgeIdToEdit || '', 8) }}). Leave blank to remove the label.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <label for="edge-label" class="text-right">Label</label>
            <Input id="edge-label" v-model="edgeLabelInput" class="col-span-3" @keyup.enter="confirmEdgeEdit" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose as-child>
             <Button type="button" variant="secondary" @click="cancelEdgeEdit">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" @click="confirmEdgeEdit">Save Label</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, computed, watch, nextTick, type Ref } from 'vue'; // Added watch, nextTick, Ref
// Import Node type and useVueFlow
import { VueFlow, type Node, type Edge, useVueFlow, Position, type EdgeMouseEvent } from '@vue-flow/core'; // Added Edge type, Position, EdgeMouseEvent
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
// Import the custom node component
import QueryCanvasNode from './QueryCanvasNode.vue';
import type { Query, QueryParameterGroup, QueryGroup, QueryNode as ApiQueryNode, QueryEdge as ApiQueryEdge } from '@/types/query'; // Import Query, QueryParameterGroup, QueryGroup, ApiQueryNode, ApiQueryEdge types
// Import Shadcn Vue components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Use DialogClose for the cancel button
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Keep for now, might remove later if not used elsewhere
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty, // Import TableEmpty for no results/loading
} from '@/components/ui/table'; // Import Table components

// --- Props ---
const props = defineProps({
  queries: {
    type: Array as PropType<Query[]>,
    required: true,
  },
  isLoadingQueries: {
    type: Boolean,
    default: false, // Missing comma was here
  },
  groupData: {
    type: Object as PropType<QueryGroup | null>,
    default: null,
  },
});

// --- Emits ---
const emit = defineEmits(['update:modified']); // Emit when layout changes interactively

// Define the custom node type mapping
const nodeTypes = {
  queryNode: QueryCanvasNode,
};

// --- Vue Flow Instance & State ---
// Get the instance to interact with nodes/edges programmatically
// Use refs for nodes/edges passed to VueFlow component
const nodes: Ref<Node[]> = ref([]);
const edges: Ref<Edge[]> = ref([]);
// Call useVueFlow without arguments; v-model handles the refs.
// Get addNodes and project from useVueFlow
const { findNode, updateNodeData, onNodesChange, onEdgesChange, onConnect, addEdges, addNodes, project, viewport, updateEdge } = useVueFlow(); // Added addNodes, project, viewport, updateEdge

// --- State for Query Assignment ---
const filterInputRef = ref<HTMLInputElement | null>(null); // Ref for the filter input
const showQuerySelectionDialog = ref(false);
const nodeIdToAssign = ref<string | null>(null);
// const selectedQueryId = ref<string | null>(null); // Replaced by selectedQueryFromTable
const selectedQueryFromTable = ref<Query | null>(null); // State for the selected query object from the table
const filterText = ref(''); // State for the filter input

// --- State for Edge Editing ---
const showEdgeEditDialog = ref(false);
const edgeIdToEdit = ref<string | null>(null);
const edgeLabelInput = ref(''); // Input model for the edge label

// --- Watcher for Incoming Group Data ---
watch(() => props.groupData, (newGroupData) => {
  console.log('QueryGroupCanvas: groupData prop changed:', newGroupData);
  if (newGroupData) {
    // Parse layout
    let layoutPositions: Record<string, { x: number; y: number }> = {};
    if (newGroupData.canvasLayout) {
      try {
        layoutPositions = JSON.parse(newGroupData.canvasLayout);
        console.log('Parsed canvasLayout:', layoutPositions);
      } catch (e) {
        console.error('Failed to parse canvasLayout JSON:', e);
        // Continue without layout if parsing fails
      }
    } else {
      console.log('No canvasLayout found in groupData.');
    }

    // Map API nodes to Vue Flow nodes, merging layout positions and query details
    nodes.value = (newGroupData.nodes || []).map((apiNode: ApiQueryNode) => {
      // Find the full Query object based on queryId
      const assignedQuery = props.queries.find(q => q['@id'] === apiNode.queryId) || null; // Default to null if not found

      return {
        id: apiNode['@id'],
        type: 'queryNode', // Use the custom type
        position: layoutPositions[apiNode['@id']] || { x: Math.random() * 400, y: Math.random() * 400 }, // Use saved position or random fallback
        data: {
          // Pass relevant data to the custom node component
          label: apiNode.label || assignedQuery?.name || apiNode['@id'], // Use node label, fallback to query name, fallback to ID
          queryId: apiNode.queryId,
          queryDetails: assignedQuery, // Pass the full Query object or null
          // inputs: inputs, // REMOVED - Handled by queryDetails
          // outputs: outputs, // REMOVED - Handled by queryDetails
        },
        // Add isSelected if needed directly by Vue Flow (usually handled internally or via custom node)
        // isSelected: apiNode.isSelected, // Usually handled internally
      };
    });
    console.log('Mapped nodes for VueFlow:', nodes.value);

    // Map API edges to Vue Flow edges
    edges.value = (newGroupData.edges || []).map((apiEdge: ApiQueryEdge) => ({
      id: apiEdge['@id'],
      source: apiEdge.fromNodeId,
      target: apiEdge.toNodeId,
      label: apiEdge.label, // Pass label if needed for edge rendering
      // Add other properties like animated, type if needed
      animated: true, // Example: make edges animated
      // isSelected: apiEdge.isSelected,
    }));
    console.log('Mapped edges for VueFlow:', edges.value);

  } else {
    // Clear the canvas if groupData is null
    nodes.value = [];
    edges.value = [];
    console.log('Cleared canvas nodes and edges.');
  }
}, { immediate: true, deep: true }); // immediate: run on load, deep: watch nested changes in groupData (though layout parsing only uses top-level)


// --- Event Handlers & Vue Flow Interaction ---

// Handle node drag stop to emit modified event
onNodesChange((changes) => {
  // Check if any change involves a position update (drag)
  const positionChanged = changes.some(change => change.type === 'position' && change.dragging === false);
  if (positionChanged) {
    console.log('Node position changed, emitting update:modified');
    emit('update:modified');
  }
  // Handle other node changes if needed (e.g., selection, removal)
});

// Handle edge changes (e.g., removal)
onEdgesChange((changes) => {
  // Check if any change involves removal or selection
  const edgeModified = changes.some(change => change.type === 'remove' || change.type === 'select');
   if (edgeModified) {
    console.log('Edge modified (removed/selected), emitting update:modified');
    emit('update:modified'); // Consider if selection changes should trigger save
  }
});

// Handle new connections
onConnect((connection) => {
  // TODO: Implement logic to create a new QueryEdge in the backend format
  // For now, just add the edge visually and mark as modified
  addEdges([ { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, animated: true } ]); // Add a temporary ID
  console.log('New connection made, emitting update:modified');
  emit('update:modified');
});

// Handle edge clicks - Open the edit dialog
const onEdgeClick = (event: EdgeMouseEvent) => {
  console.log('Edge clicked:', event.edge.id, event.edge);
  // Deselect other edges/nodes first for clarity
  nodes.value = nodes.value.map(n => ({ ...n, selected: false }));
  edges.value = edges.value.map(e => ({ ...e, selected: e.id === event.edge.id }));

  // Set state for the dialog
  edgeIdToEdit.value = event.edge.id;
  // Ensure label is treated as a string for the input
  edgeLabelInput.value = typeof event.edge.label === 'string' ? event.edge.label : '';
  showEdgeEditDialog.value = true;
};

// --- Edge Edit Dialog Logic ---
const confirmEdgeEdit = () => {
  if (!edgeIdToEdit.value) return;

  const edgeId = edgeIdToEdit.value; // Capture the ID
  const newLabel = edgeLabelInput.value.trim(); // Trim whitespace

  console.log(`Updating edge ${edgeId} label to: "${newLabel}"`);

  // Find the index of the edge to update
  const edgeIndex = edges.value.findIndex(e => e.id === edgeId);

  if (edgeIndex !== -1) {
    // Create a new edge object with the updated label
    const updatedEdge = {
      ...edges.value[edgeIndex],
      label: newLabel || undefined, // Set label or undefined to remove it
    };
    // Replace the old edge with the updated one in the array
    edges.value.splice(edgeIndex, 1, updatedEdge);
  } else {
    console.warn(`Edge with ID ${edgeId} not found for update.`);
  }

  // Emit modified event as edge data changed
  console.log('Edge data changed (label updated), emitting update:modified');
  emit('update:modified');

  cancelEdgeEdit(); // Close dialog after saving
};

const cancelEdgeEdit = () => {
  showEdgeEditDialog.value = false;
  edgeIdToEdit.value = null;
  edgeLabelInput.value = '';
  // Deselect the edge after closing
  edges.value = edges.value.map(e => ({ ...e, selected: false }));
};


// --- Add New Node ---
let newNodeCounter = 0; // Simple counter for unique IDs

const handleAddNode = () => {
  newNodeCounter++;
  const newNodeId = `new-node-${Date.now()}-${newNodeCounter}`; // More robust unique ID

  // Calculate position near the center of the current viewport
  const { x, y, zoom } = viewport.value;
  // Project the center of the screen to flow coordinates
  // Adjusting calculation slightly - project viewport center (0,0 relative to viewport)
  const canvasCenter = project({ x: window.innerWidth / 2, y: window.innerHeight / 3 }); // Place slightly above center vertically

  const newNode: Node = {
    id: newNodeId,
    type: 'queryNode', // Use the custom type
    position: { x: canvasCenter.x, y: canvasCenter.y }, // Use projected center
    label: `New Node ${newNodeCounter}`, // Default label
    data: {
      label: `New Node ${newNodeCounter}`, // Initial data label
      queryId: undefined, // No query assigned initially
      queryDetails: null, // Initialize with null query details
      // inputs: [], // REMOVED
      // outputs: [], // REMOVED
    },
    // sourcePosition/targetPosition are handled by the custom node's Handles now
    // sourcePosition: Position.Right, // REMOVED
    // targetPosition: Position.Left,
  };

  addNodes([newNode]);
  console.log(`Added new node: ${newNodeId} at`, newNode.position);
  emit('update:modified'); // Signal that the group has changed
};


// --- Query Assignment Logic (remains largely the same) ---
const handleAssignQuery = (nodeId: string) => {
  console.log(`Canvas: Received assign-query event for node ID: ${nodeId}`);
  nodeIdToAssign.value = nodeId;
  // selectedQueryId.value = null; // Reset selection on open - replaced
  selectedQueryFromTable.value = null; // Reset table selection
  filterText.value = ''; // Reset filter text
  showQuerySelectionDialog.value = true;
};

// Computed property to filter queries based on filterText
const filteredQueries = computed(() => {
  if (!filterText.value) {
    return props.queries;
  }
  const lowerCaseFilter = filterText.value.toLowerCase();
  return props.queries.filter(query =>
    query.name?.toLowerCase().includes(lowerCaseFilter) ||
    query.description?.toLowerCase().includes(lowerCaseFilter) ||
    query['@id']?.toLowerCase().includes(lowerCaseFilter)
  );
});

// --- Formatting Helpers ---
const formatShortId = (id: string, length = 5) => {
  if (!id) return '';
  // Use the UTF-8 ellipsis character directly
  return id.length > length ? `…${id.slice(-length)}` : id;
};

const formatParams = (params: QueryParameterGroup[] | null): string => {
  if (!params || params.length === 0) return '-';
  // Flatten the vars from all groups and extract paramName
  const paramNames = params.flatMap(group => group.vars.map(v => v.paramName));
  return paramNames.join(', ') || '-';
};

const formatOutputs = (outputs: string[] | null): string => {
  if (!outputs || outputs.length === 0) return '-';
  return outputs.join(', ');
};

// --- Event Handlers ---

// Handle row click in the table
const handleRowClick = (query: Query) => {
  selectedQueryFromTable.value = query;
};

// Close the dialog and reset state
const closeDialog = () => {
  showQuerySelectionDialog.value = false;
  nodeIdToAssign.value = null;
  // selectedQueryId.value = null; // Replaced
  selectedQueryFromTable.value = null;
  filterText.value = ''; // Also reset filter on close
};

// Confirm the selection and update the node using the selected query object
const confirmQuerySelection = () => {
  if (!selectedQueryFromTable.value || !nodeIdToAssign.value) return;

  const selectedQuery = selectedQueryFromTable.value; // Use the object directly

  // No need to extract inputs/outputs here anymore, just pass the whole query object
  // const inputs = selectedQuery.parameters?.flatMap(group => group.vars.map(v => v.paramName)) || [];
  // const outputs = selectedQuery.outputVars || [];

  console.log(`Canvas: Assigning query: ${selectedQuery.name} (${selectedQuery['@id']}) to node ${nodeIdToAssign.value}`);
  // console.log(`  Inputs: ${inputs.join(', ')}`); // No longer needed here
  // console.log(`  Outputs: ${outputs.join(', ')}`); // No longer needed here

  updateNodeData(nodeIdToAssign.value, {
    label: selectedQuery.name || selectedQuery['@id'], // Update label to query name or ID
    queryId: selectedQuery['@id'], // Store the selected query ID
    queryDetails: selectedQuery, // Pass the full selected query object
    // inputs: inputs, // REMOVED
    // outputs: outputs, // REMOVED
  });
  console.log(`Canvas: Updated node ${nodeIdToAssign.value} data with queryDetails.`);

  // Emit modified event as node data changed
  console.log('Node data changed (query assigned), emitting update:modified');
  emit('update:modified');

  closeDialog(); // Close dialog after assignment
};

// --- Watcher for Dialog Open ---
watch(showQuerySelectionDialog, (newValue) => {
  if (newValue) {
    nextTick(() => {
      filterInputRef.value?.focus();
    });
  }
});

// --- Expose Function for Saving ---
// Function to get the current layout as a JSON string
const getCanvasLayoutString = (): string => {
  const layoutMap: Record<string, { x: number; y: number }> = {};
  nodes.value.forEach(node => {
    // Ensure position exists and has x/y before adding
    if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
      layoutMap[node.id] = { x: node.position.x, y: node.position.y };
    } else {
      console.warn(`Node ${node.id} missing valid position data.`);
    }
  });
  const layoutString = JSON.stringify(layoutMap);
  console.log('Generated canvasLayout string:', layoutString);
  return layoutString;
};

// Expose the function so the parent component can call it
defineExpose({
  getCanvasLayoutString,
});


// TODO: Implement logic for adding/removing query nodes (needs parent interaction)
// TODO: Refine edge creation logic (onConnect) to potentially create backend-compatible edges
</script>

<style>
/* Add any component-specific styles here if needed */
/* Ensure the container has a defined height for Vue Flow to render correctly */
.vue-flow__container {
  height: 100%;
}

/* Bring edges to the front */
.vue-flow__edge {
  z-index: 20 !important; /* Higher than node handles (z-index: 10) */
}
</style>
