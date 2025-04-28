<template>
  <div v-if="hasAnyParameters" class="my-2 p-2 border rounded bg-gray-50">
    <h3 class="text-md font-semibold mb-1">Arguments</h3>

    <!-- VALUES Parameters Section -->
    <div v-if="groupedValueRows.length > 0" class="mb-4">
      <h4 class="text-sm font-medium text-gray-800 mb-2 border-b pb-0.5">Values clauses</h4>
      <div class="space-y-4">
        <!-- Iterate through parameter groups -->
        <div v-for="(groupData, groupIndex) in groupedValueRows" :key="`group-${groupIndex}`" class="border rounded p-2 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <h5 class="text-sm font-medium text-gray-600">{{ groupData.group.join(', ') }}</h5>
            <Button variant="outline" size="sm" class="h-7 px-2" @click="addValueArgumentRow(groupData.group)">
              Add Row
            </Button>
          </div>

          <!-- Iterate through rows for the current group -->
          <div v-for="(row, rowIndex) in groupData.rows" :key="`group-${groupIndex}-row-${rowIndex}`" class="flex items-start space-x-2 mb-2 p-1 border-b last:border-b-0 last:mb-0">
            <!-- Inputs for each parameter in the row -->
            <div class="flex-grow grid gap-2" :style="{ gridTemplateColumns: `repeat(${groupData.group.length}, minmax(0, 1fr))` }">
              <!-- Single Parameter Input Area -->
              <div v-for="paramName in groupData.group" :key="`param-${paramName}-row-${rowIndex}`" class="flex items-center space-x-1.5">
                 <!-- Input Field -->
                 <div class="flex-grow">
                   <Input
                     :model-value="row[paramName].value"
                     :placeholder="paramName"
                     class="w-full text-sm h-8"
                     @update:model-value="updateValueArgumentValue(paramName, rowIndex, String($event))"
                   />
                 </div>
                 <!-- Type Toggle Button -->
                 <div class="flex-shrink-0">
                   <div class="flex text-xs border rounded overflow-hidden items-center h-8">
                     <span
                       class="px-1.5 py-1 cursor-pointer flex items-center h-full"
                       :class="{ 'bg-blue-500 text-white': row[paramName].type === 'literal', 'bg-gray-100 hover:bg-gray-200': row[paramName].type !== 'literal' }"
                       @click="updateValueArgumentType(paramName, rowIndex, 'literal')"
                       title="Set type to Literal"
                     >
                       Lit
                     </span>
                     <span
                       class="px-1.5 py-1 cursor-pointer flex items-center h-full border-l"
                       :class="{ 'bg-blue-500 text-white': row[paramName].type === 'uri', 'bg-gray-100 hover:bg-gray-200': row[paramName].type !== 'uri' }"
                       @click="updateValueArgumentType(paramName, rowIndex, 'uri')"
                       title="Set type to URI"
                     >
                       URI
                     </span>
                   </div>
                 </div>
              </div>
            </div>
            <!-- Remove Row Button -->
            <div class="flex-shrink-0 self-center"> <!-- Use self-center for vertical alignment -->
              <Button
                v-if="groupData.rows.length > 1"
                variant="ghost"
                size="icon"
                class="h-7 w-7 text-destructive hover:bg-destructive/10"
                @click="removeValueArgumentRow(groupData.group, rowIndex)"
                aria-label="Remove argument row"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
              <!-- Placeholder for alignment when button is hidden -->
              <div v-else class="w-7 h-7"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- LIMIT Parameters Section -->
    <div v-if="limitParameterNames.length > 0" class="mb-4">
       <h4 class="text-sm font-medium text-gray-800 mb-2 border-b pb-0.5">Limit clauses</h4>
       <div class="space-y-2">
         <div v-for="paramName in limitParameterNames" :key="`limit-${paramName}`" class="flex items-center space-x-1.5">
           <label class="text-sm font-medium text-gray-700 w-12 text-right flex-shrink-0">{{ paramName }}</label>
           <Input
             :model-value="localLimitArguments[paramName]"
             :placeholder="`value`"
             type="number"
             min="0"
             class="w-full text-sm h-8"
             @update:model-value="updateLimitArgumentValue(paramName, String($event))"
           />
         </div>
       </div>
    </div>

    <!-- OFFSET Parameters Section -->
    <div v-if="offsetParameterNames.length > 0" class="mt-4"> <!-- Added mt-4 for separation -->
       <h4 class="text-sm font-medium text-gray-800 mb-2 border-b pb-0.5">Offset clauses</h4>
       <div class="space-y-2">
         <div v-for="paramName in offsetParameterNames" :key="`offset-${paramName}`" class="flex items-center space-x-1.5">
           <label class="text-sm font-medium text-gray-700 w-12 text-right flex-shrink-0">{{ paramName }}</label>
           <Input
             :model-value="localOffsetArguments[paramName]"
             :placeholder="`value`"
             type="number"
             min="0"
             class="w-full text-sm h-8"
             @update:model-value="updateOffsetArgumentValue(paramName, String($event))"
           />
         </div>
       </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// --- Types ---
interface ArgumentValue {
  value: string;
  type: 'uri' | 'literal';
}

interface DetectedParameters {
  valuesParameters?: string[][]; // Array of arrays of param names (e.g., [["p"], ["x", "y"]])
  limitParameters?: string[];   // Array of param names (e.g., ["1"])
  offsetParameters?: string[];  // Array of param names (e.g., ["2"])
}

interface QueryArgumentsModel {
  values: Record<string, ArgumentValue[]>; // Param name -> Array of values (index implies grouping)
  limit: Record<string, string>; // Param name -> value string
  offset: Record<string, string>; // Param name -> value string
}

// Structure for the template rendering
interface GroupRow {
  [paramName: string]: ArgumentValue;
}
interface GroupedRowsData {
  group: string[]; // The parameter names in the group
  rows: GroupRow[];
}


// --- Props ---
const props = defineProps({
  parameters: {
    type: Object as PropType<DetectedParameters | null>,
    required: true,
  },
  modelValue: { // For v-model: expects QueryArgumentsModel
    type: Object as PropType<QueryArgumentsModel>,
    default: () => ({ values: {}, limit: {}, offset: {} }),
  },
});

// --- Emits ---
const emit = defineEmits(['update:modelValue']); // For v-model

// --- Local State ---
// Mirror the v-model structure. The index of arrays corresponds to the row.
const localValuesArguments = ref<Record<string, ArgumentValue[]>>({});
const localLimitArguments = ref<Record<string, string>>({});
const localOffsetArguments = ref<Record<string, string>>({});

// --- Computed ---
const valueParameterGroups = computed(() => props.parameters?.valuesParameters ?? []);
const limitParameterNames = computed(() => props.parameters?.limitParameters ?? []);
const offsetParameterNames = computed(() => props.parameters?.offsetParameters ?? []);

const hasAnyParameters = computed(() => {
    return valueParameterGroups.value.length > 0 ||
           limitParameterNames.value.length > 0 ||
           offsetParameterNames.value.length > 0;
});

// Computed property to transform flat localValuesArguments into grouped rows for the template
const groupedValueRows = computed((): GroupedRowsData[] => {
  const result: GroupedRowsData[] = [];
  const groups = valueParameterGroups.value;

  groups.forEach(group => {
    if (group.length === 0) return; // Skip empty groups

    let maxRows = 0;
    group.forEach(paramName => {
      // Ensure the param array exists in local state, initialize if not
      if (!localValuesArguments.value[paramName]) {
        localValuesArguments.value[paramName] = [];
      }
      maxRows = Math.max(maxRows, localValuesArguments.value[paramName].length);
    });

    // Ensure at least one row is available for input if the group exists but has no data yet
    if (maxRows === 0) maxRows = 1;

    const rows: GroupRow[] = [];
    for (let i = 0; i < maxRows; i++) {
      const row: GroupRow = {};
      group.forEach(paramName => {
        // Get value from local state or provide default for the row
        const arg = localValuesArguments.value[paramName]?.[i];
        row[paramName] = arg ? { ...arg } : { value: '', type: 'literal' }; // Use default if undefined
      });
      rows.push(row);
    }
    result.push({ group, rows });
  });
  return result;
});


// --- Watchers ---
// Initialize and sync local state when parameters or modelValue change
watch([() => props.parameters, () => props.modelValue], ([newParams, newModelValue]) => {
  const currentModel = newModelValue || { values: {}, limit: {}, offset: {} };
  const newValuesState: Record<string, ArgumentValue[]> = {};
  let valuesChanged = false;

  // --- Sync VALUES parameters ---
  // Iterate through defined groups to ensure consistency
  valueParameterGroups.value.forEach(group => {
    if (group.length === 0) return;

    let maxLen = 0;
    // Find the max length for this group in the incoming model
    group.forEach(paramName => {
      maxLen = Math.max(maxLen, currentModel.values?.[paramName]?.length ?? 0);
    });

    // Ensure at least one row if group exists
    if (maxLen === 0) maxLen = 1;

    // Populate newValuesState, ensuring all params in the group have the same length
    group.forEach(paramName => {
      const modelVal = currentModel.values?.[paramName] ?? [];
      const currentParamState: ArgumentValue[] = [];
      for (let i = 0; i < maxLen; i++) {
        // Deep copy existing or provide default
        currentParamState.push(modelVal[i] ? { ...modelVal[i] } : { value: '', type: 'literal' });
      }
      newValuesState[paramName] = currentParamState;
    });
  });

  // Check if the calculated new state differs from the current local state
  if (JSON.stringify(localValuesArguments.value) !== JSON.stringify(newValuesState)) {
    localValuesArguments.value = newValuesState;
    valuesChanged = true;
  }

  // --- Sync LIMIT parameters ---
  const newLimitState: Record<string, string> = {};
  let limitChanged = false;
  limitParameterNames.value.forEach(name => {
    newLimitState[name] = currentModel.limit?.[name] ?? '';
  });
   if (JSON.stringify(localLimitArguments.value) !== JSON.stringify(newLimitState)) {
      localLimitArguments.value = newLimitState;
      limitChanged = true;
   }

  // --- Sync OFFSET parameters ---
  const newOffsetState: Record<string, string> = {};
  let offsetChanged = false;
  offsetParameterNames.value.forEach(name => {
    newOffsetState[name] = currentModel.offset?.[name] ?? '';
  });
  if (JSON.stringify(localOffsetArguments.value) !== JSON.stringify(newOffsetState)) {
      localOffsetArguments.value = newOffsetState;
      offsetChanged = true;
  }

  // Note: This watcher primarily ensures local state reflects props and initializes correctly.
  // It also ensures consistency within value groups.

}, { deep: true, immediate: true });


// --- Methods ---

// --- VALUES Parameter Methods ---
const updateValueArgumentValue = (paramName: string, rowIndex: number, value: string) => {
  // Ensure the array and row exist before updating
  if (localValuesArguments.value[paramName]?.[rowIndex]) {
    localValuesArguments.value[paramName][rowIndex].value = value;
    emitModelUpdate();
  } else {
    // This case might happen if the row was just added implicitly by the computed prop
    // We might need to ensure the structure exists first
    console.warn(`Attempted to update non-existent value at ${paramName}[${rowIndex}]`);
    // Optionally, create the structure here if needed, though the watcher should handle initialization
  }
};

const updateValueArgumentType = (paramName: string, rowIndex: number, type: 'uri' | 'literal') => {
 if (localValuesArguments.value[paramName]?.[rowIndex]) {
    localValuesArguments.value[paramName][rowIndex].type = type;
    emitModelUpdate();
  } else {
     console.warn(`Attempted to update type for non-existent value at ${paramName}[${rowIndex}]`);
  }
};

// Adds a new row to a specific group
const addValueArgumentRow = (group: string[]) => {
  if (!group || group.length === 0) return;

  // Find the current number of rows for this group (should be consistent)
  const currentRowCount = localValuesArguments.value[group[0]]?.length ?? 0;

  // Add a new default ArgumentValue to each parameter array in the group
  group.forEach(paramName => {
    if (!localValuesArguments.value[paramName]) {
      localValuesArguments.value[paramName] = []; // Initialize if somehow missing
    }
    // Ensure the array length matches before pushing
    while (localValuesArguments.value[paramName].length < currentRowCount) {
        localValuesArguments.value[paramName].push({ value: '', type: 'literal' });
    }
    localValuesArguments.value[paramName].push({ value: '', type: 'literal' });
  });
  emitModelUpdate();
};

// Removes a specific row from a group
const removeValueArgumentRow = (group: string[], rowIndex: number) => {
  if (!group || group.length === 0) return;

  // Check if the row index is valid and if there's more than one row
  const rowCount = localValuesArguments.value[group[0]]?.length ?? 0;
  if (rowIndex < 0 || rowIndex >= rowCount || rowCount <= 1) {
      // Cannot remove the last row or invalid index
      return;
  }

  // Remove the element at rowIndex from each parameter array in the group
  group.forEach(paramName => {
    if (localValuesArguments.value[paramName]?.[rowIndex]) {
      localValuesArguments.value[paramName].splice(rowIndex, 1);
    }
  });
  emitModelUpdate();
};


// --- LIMIT Parameter Methods ---
const updateLimitArgumentValue = (paramName: string, value: string) => {
    localLimitArguments.value[paramName] = value;
    emitModelUpdate();
};

// --- OFFSET Parameter Methods ---
const updateOffsetArgumentValue = (paramName: string, value: string) => {
    localOffsetArguments.value[paramName] = value;
    emitModelUpdate();
};


// --- Emit Helper ---
const emitModelUpdate = () => {
  // Construct the full model to emit, ensuring deep copies
  const modelToEmit: QueryArgumentsModel = {
    values: {},
    limit: { ...localLimitArguments.value },
    offset: { ...localOffsetArguments.value },
  };

  // Deep copy values arguments from local state
  for (const paramName in localValuesArguments.value) {
    // Only include parameters that are actually part of defined groups
    const isInAnyGroup = valueParameterGroups.value.some(group => group.includes(paramName));
    if (isInAnyGroup && Array.isArray(localValuesArguments.value[paramName])) {
       // Filter out potentially empty trailing rows if they were added just for UI consistency
       // but haven't been filled. Let's reconsider this - maybe emit exactly what's in local state.
       // For now, emit the full local state for simplicity.
       modelToEmit.values[paramName] = localValuesArguments.value[paramName].map(arg => ({ ...arg }));
    }
  }

  emit('update:modelValue', modelToEmit);
};

</script>
