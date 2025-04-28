<template>
  <!-- Main node container: flex-row, increased min-width -->
  <div class="query-node border rounded shadow bg-white min-w-[400px] flex flex-row min-h-[120px] relative">

    <!-- Left Pane: Query Details -->
    <div class="left-pane w-1/2 flex flex-col p-2 border-r border-gray-200">
      <div v-if="data.queryDetails" class="query-name">
        {{ data.queryDetails.name }}
      </div>
      <!-- TODO: Add Backend/Other details here -->
      <div class="flex-grow"></div> <!-- Spacer to push pseudo-query down -->
      <div v-if="data.queryDetails" class="pseudo-query-section">
        {{ data.queryDetails.queryType }} { ... }
      </div>
      <div v-else class="flex-grow flex items-center justify-center text-gray-400 text-sm">
        <!-- Placeholder if no details -->
        Details
      </div>
    </div>

    <!-- Right Pane: Inputs & Outputs -->
    <div class="right-pane w-1/2 flex flex-col justify-between p-2 relative">
      <!-- Input Section (Top Right) -->
      <div v-if="data.queryDetails?.parameters && data.queryDetails.parameters.length > 0" class="input-section">
        <!-- Loop through parameter groups -->
        <div v-for="(group, groupIndex) in data.queryDetails.parameters" :key="`input-group-${groupIndex}`" class="input-group">
           <!-- Single Handle per group - Back to Top -->
           <Handle
            :id="`input-group-${groupIndex}`"
            type="target"
            :position="Position.Top"
            class="handle-input-group"
          />
          <!-- Inner container for horizontal params -->
          <div class="input-group-params">
            <div v-for="param in group.vars" :key="param.paramName" class="input-param">
              ?{{ param.paramName }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="input-section min-h-[30px] flex items-center justify-center text-gray-400 text-xs"> <!-- Placeholder for spacing if no inputs -->
        Inputs
      </div>

      <!-- Output Section (Bottom Right) -->
      <div v-if="data.queryDetails?.outputVars && data.queryDetails.outputVars.length > 0" class="output-section">
         <!-- Single container for all outputs -->
         <div class="output-group">
            <!-- Single Handle for the group - Back to Bottom -->
            <Handle
              id="output-group"
              type="source"
              :position="Position.Bottom"
              class="handle-output-group"
            />
            <!-- Display vars horizontally inside -->
            <div v-for="outputVar in data.queryDetails.outputVars" :key="`output-${outputVar}`" class="output-var">
              ?{{ outputVar }}
            </div>
         </div>
      </div>
       <div v-else class="output-section min-h-[30px] flex items-center justify-center text-gray-400 text-xs"> <!-- Placeholder for spacing if no outputs -->
        Outputs
      </div>
    </div>

    <!-- Placeholder/Assign Button if no query assigned (Covers whole node) -->
    <div v-if="!data.queryDetails" class="placeholder-node absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center">
      <div>No Query Assigned</div>
      <Button
        variant="outline"
        size="sm"
        @click="emitAssignQuery"
        class="mt-2"
      >
        Assign Query
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import { Button } from '@/components/ui/button'; // Import Button
import type { Query } from '@/types/query'; // Import Query type

// Define props accessible inside the custom node
interface QueryNodeProps extends NodeProps {
  id: string;
  data: {
    label?: string; // Keep label for potential fallback or other uses
    queryId?: string;
    queryDetails?: Query | null; // Expect the full query details
  };
}

const props = defineProps<QueryNodeProps>();

// Define emits
const emit = defineEmits<{
  (e: 'assign-query', nodeId: string): void;
}>();

// Method to emit the event
const emitAssignQuery = () => {
  emit('assign-query', props.id);
};

</script>

<style scoped>
/* .query-node styles updated in template */

.left-pane {
  /* Styles defined in template */
}

.right-pane {
  /* Styles defined in template */
}

.query-name {
  font-size: 0.9rem; /* Slightly larger */
  font-weight: bold;
  color: #333; /* Darker color */
  padding: 4px 0; /* Adjust padding, remove horizontal */
  /* border-bottom: 1px solid #eee; */ /* Removed separator line */
  text-align: left; /* Align name left */
  margin-bottom: 8px; /* Space below name */
  white-space: normal; /* Allow wrapping */
}

.input-section {
  display: flex;
  flex-direction: column; /* Stack groups vertically if multiple */
  align-items: center; /* Center groups horizontally */
  /* justify-content: space-around; */ /* Removed */
  /* align-items: flex-start; */ /* Removed */
  /* padding-top: 10px; */ /* REMOVED padding for top handle */
  min-height: 30px; /* Ensure space for handles */
  position: relative; /* For handle positioning */
  /* margin-bottom: 8px; */ /* Removed, handled by parent flex */
  width: 100%; /* Take full width of right pane */
}

.input-group {
  display: flex; /* Use flex for handle positioning */
  flex-direction: column;
  align-items: center; /* Center the group box horizontally */
  margin-bottom: 5px; /* Vertical spacing between groups */
  padding: 5px; /* Consistent padding */
  border: 1px solid #c3daff; /* Box around group */
  background-color: #f0f5ff; /* Lighter blue background for group */
  border-radius: 4px;
  position: relative; /* For handle positioning */
  min-width: 40px; /* Ensure minimum width */
  width: 90%; /* Make group slightly narrower than pane */
}

.input-group-params {
  display: flex; /* Arrange params horizontally */
  flex-direction: row;
  justify-content: center; /* Center params within the group box */
  flex-wrap: wrap; /* Allow wrapping if many params */
}

.input-param {
  font-size: 0.75rem;
  margin: 2px 3px; /* Horizontal spacing */
  text-align: center;
  padding: 1px 4px;
  background-color: #e9efff; /* Light blue background */
  border-radius: 3px;
  border: 1px solid #c3daff;
  white-space: nowrap;
}

.pseudo-query-section {
  font-family: monospace;
  font-size: 0.8rem;
  text-align: left; /* Align left */
  padding: 5px;
  background-color: #f8f8f8; /* Lighter grey */
  border: 1px solid #eee; /* Add full border */
  border-radius: 4px;
  /* margin-top: auto; */ /* Handled by parent flex */
  /* margin-bottom: 8px; */ /* Removed */
  width: 100%; /* Take full width of left pane */
  overflow-wrap: break-word; /* Allow wrapping if needed */
}

.output-section {
  display: flex;
  flex-direction: column; /* Stack groups vertically if multiple */
  align-items: center; /* Center groups horizontally */
  /* justify-content: space-around; */ /* Removed */
  /* align-items: flex-end; */ /* Removed */
  /* padding-bottom: 10px; */ /* REMOVED padding for bottom handle */
  min-height: 30px; /* Ensure space for handles */
  position: relative; /* For handle positioning */
  width: 100%; /* Take full width of right pane */
}

.output-group {
  display: flex; /* Use flex for handle positioning */
  flex-direction: row; /* Keep vars horizontal */
  align-items: center; /* Center vars vertically */
  justify-content: center; /* Center vars horizontally */
  flex-wrap: wrap; /* Allow wrapping */
  /* margin: 0 auto; */ /* Removed auto margin */
  margin-top: 5px; /* Vertical spacing between groups (if multiple outputs were possible) */
  padding: 5px; /* Consistent padding */
  border: 1px solid #bbf7d0; /* Box around group */
  background-color: #f0fff4; /* Lighter green background */
  border-radius: 4px;
  position: relative; /* For handle positioning */
  min-width: 40px; /* Ensure minimum width */
  width: 90%; /* Make group slightly narrower than pane */
}

.output-var {
  font-size: 0.75rem;
  margin: 2px 3px; /* Horizontal spacing */
  text-align: center;
  padding: 1px 4px;
  background-color: #e7ffee; /* Light green background */
  border-radius: 3px;
  border: 1px solid #bbf7d0;
  white-space: nowrap;
}

/* Group Handle Styles - Adjusted for Top/Bottom Edges */
.handle-input-group {
  position: absolute !important;
  top: 0px !important; /* Position handle directly on top edge */
  left: 50% !important;
  transform: translateX(-50%) translateY(-50%) !important; /* Center vertically on edge */
  background-color: #3b82f6 !important; /* Match color */
  border-color: white !important;
  width: 8px !important; /* Smaller handles */
  height: 8px !important;
  border-width: 1px !important;
  pointer-events: all; /* Ensure handles are interactive */
  z-index: 10; /* Ensure handles are on top */
}

.handle-output-group {
  position: absolute !important;
  bottom: 0px !important; /* Position handle directly on bottom edge */
  left: 50% !important;
  /* right: auto !important; */ /* No longer needed */
  transform: translateX(-50%) translateY(50%) !important; /* Center vertically on edge */
  background-color: #22c55e !important; /* Match color */
  border-color: white !important;
  width: 8px !important; /* Smaller handles */
  height: 8px !important;
  border-width: 1px !important;
  pointer-events: all; /* Ensure handles are interactive */
  z-index: 10; /* Ensure handles are on top */
}

/* Common Handle Styles - Removed as specific styles are above */
/* .vue-flow__handle { ... } */

.placeholder-node {
  /* Styles updated in template */
}
</style>
