<template>
  <div class="p-4 border rounded mb-4">
    <!-- Toggle Button -->
    <button @click="toggleDetails" class="flex items-center justify-between w-full mb-2 text-lg font-semibold">
      <span>Query Group Details</span>
      <!-- Basic Chevron Icon (replace with a proper icon component if available) -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform duration-200" :class="{ 'rotate-180': isExpanded }">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Collapsible Content -->
    <div v-if="isExpanded">
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        <div class="flex items-center gap-2">
          <label for="groupName" class="text-sm font-medium w-16 text-right flex-shrink-0">Name</label>
          <Input id="groupName" v-model="editedName" type="text" placeholder="Enter group name..." class="flex-grow" />
        </div>
        <div class="flex items-center gap-2">
          <label for="groupId" class="text-sm font-medium w-16 text-right flex-shrink-0">ID (URI)</label>
          <Input id="groupId" v-model="editedId" type="text" placeholder="Optional group ID (URI)..." class="flex-grow" />
          <!-- TODO: Add URI validation feedback -->
        </div>
        <div class="col-span-2 flex items-start gap-2">
          <label for="groupDescription" class="text-sm font-medium w-16 text-right flex-shrink-0 pt-2">Description</label>
          <Textarea id="groupDescription" v-model="editedDescription" placeholder="Enter group description..." class="flex-grow" />
        </div>
      </div>
      <!-- Action Buttons -->
      <div class="flex justify-end gap-2">
         <Button variant="outline" @click="handleCancel">Cancel</Button>
         <Button @click="handleSave" :disabled="!isModified || !editedName.trim()">Save Details</Button>
         <!-- TODO: Add better validation/disabled logic -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { QueryGroup } from '@/types/query';

import { type Ref } from 'vue'; // Import Ref if needed for direct manipulation, but let's try props/emits first

// --- Props ---
const props = defineProps<{
  selectedGroup: QueryGroup | null;
  isNewlyCreated: boolean; // Flag indicating if the selected group was just created
}>();

// --- Emits ---
const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', details: Partial<QueryGroup>): void // Emit only changed fields
  (e: 'update:isNewlyCreated', value: boolean): void // To reset the flag using v-model pattern
}>();

// --- State ---
const editedName = ref('');
const editedDescription = ref('');
const editedId = ref('');
const isExpanded = ref(false); // State to control visibility, start collapsed

// Store initial state for modification check
const initialName = ref('');
const initialDescription = ref('');
const initialId = ref('');

// --- Computed ---
const isModified = computed(() => {
    return editedName.value !== initialName.value ||
           editedDescription.value !== initialDescription.value ||
           editedId.value !== initialId.value;
});

// --- Watchers ---
// Watch the prop to reset internal state when the selected group changes
watch(() => props.selectedGroup, (newGroup) => {
    editedName.value = newGroup?.name || '';
    editedDescription.value = newGroup?.description || '';
    editedId.value = newGroup?.['@id'] || '';
    // Store initial state for comparison
    initialName.value = editedName.value;
    initialDescription.value = editedDescription.value;
    initialId.value = editedId.value;
    // Optionally reset expanded state when group changes, or keep it open
    // isExpanded.value = false; // Keep expanded state independent of group change unless explicitly handled
}, { immediate: true }); // immediate: true to initialize on component mount

// Watch for the newly created flag combined with a selected group
watch([() => props.selectedGroup, () => props.isNewlyCreated], ([newGroup, isNew]) => {
  if (newGroup && isNew) {
    console.log('QueryGroupDetailsEditor: Detected newly created group, expanding details.');
    isExpanded.value = true;
    // Reset the flag in the parent via v-model:isNewlyCreated pattern
    emit('update:isNewlyCreated', false);
  }
}, { immediate: true }); // Check immediately on mount/prop update


// --- Methods ---
const toggleDetails = () => {
  isExpanded.value = !isExpanded.value;
};

const handleCancel = () => {
  // Reset state to initial values before emitting cancel
  editedName.value = initialName.value;
  editedDescription.value = initialDescription.value;
  editedId.value = initialId.value;
  isExpanded.value = false; // Collapse on cancel
  emit('cancel');
};

const handleSave = () => {
  if (!isModified.value || !editedName.value.trim()) return; // Basic validation

  // TODO: Add URI validation for editedId if present

  const updatedDetails: Partial<QueryGroup> = {};
  if (editedName.value !== initialName.value) {
      updatedDetails.name = editedName.value;
  }
  if (editedDescription.value !== initialDescription.value) {
      updatedDetails.description = editedDescription.value;
  }
  if (editedId.value !== initialId.value) {
      updatedDetails['@id'] = editedId.value; // Use '@id'
  }

  emit('save', updatedDetails);
  // Update initial state after successful save is confirmed by parent
  initialName.value = editedName.value;
  initialDescription.value = editedDescription.value;
  initialId.value = editedId.value;
  isExpanded.value = false; // Collapse on save
};

// Method to get the current state, needed by parent
const getCurrentState = () => {
    return {
        name: editedName.value,
        description: editedDescription.value,
        '@id': editedId.value // Return the potential ID as well
    };
};

// Expose the method for the parent component
defineExpose({
    getCurrentState
});

</script>
