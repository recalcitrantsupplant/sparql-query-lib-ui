<template>
  <div class="p-2 border rounded mb-2 bg-gray-50">
    <div class="flex justify-between items-start gap-2">
      <!-- Left part: Name and Description -->
      <div class="flex-grow space-y-1">
        <!-- Name -->
        <div class="flex flex-col gap-0.5">
          <label for="unified-item-name" class="text-sm font-semibold text-gray-800">Name:</label>
          <div v-if="!isEditing" class="flex-grow">
            <p class="text-sm min-h-[1.5rem] flex items-center">{{ item?.name || 'N/A' }}</p>
          </div>
          <div v-else class="flex-grow">
            <Input
              id="unified-item-name"
              v-model="editedName"
              placeholder="Name"
              class="text-md"
              required
              @input="handleInput"
            />
            <p v-if="isEditing && !editedName?.trim()" class="text-xs text-red-600 mt-1">Name is required.</p>
          </div>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-0.5">
          <label for="unified-item-description" class="text-sm font-semibold text-gray-800">Description:</label>
          <div v-if="!isEditing" class="flex-grow">
            <p class="text-sm text-gray-600 whitespace-pre-wrap min-h-[2.25rem] flex items-center">{{ item?.description || 'No description.' }}</p>
          </div>
          <div v-else class="flex-grow">
            <Textarea
              id="unified-item-description"
              v-model="editedDescription"
              placeholder="Description (optional)"
              class="text-sm"
              rows="3"
              @input="handleInput"
            />
          </div>
        </div>
      </div>

      <!-- Right part: ID and Action Buttons -->
      <div class="flex items-center gap-4 flex-shrink-0"> <!-- Changed to flex items-center for horizontal layout -->
        <!-- ID Display -->
        <div class="flex items-center text-xs font-medium text-gray-700">
          <div v-if="item?.['@id']" class="flex items-center">
            <span class="mr-1">ID:</span>
            <span class="text-sm font-mono break-all mr-1" :title="item?.['@id']">{{ shortId }}</span>
            <Button
              variant="ghost"
              size="icon"
              @click="copyIdToClipboard"
              title="Copy ID"
              class="text-gray-500 hover:text-gray-700 h-5 w-5"
            >
              <CopyIcon class="h-3 w-3" />
            </Button>
          </div>
          <div v-else-if="isCreating && isEditing" class="text-xs text-gray-500 h-5 flex items-center">
            <span>ID will be generated on save.</span>
          </div>
           <div v-else class="h-5"></div> <!-- Placeholder -->
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <Button
            v-if="!isEditing && item"
            variant="outline"
            size="sm"
            @click="startEditing"
          >
            Edit
          </Button>
          <Button
            v-if="isEditing"
            variant="secondary"
            size="sm"
            @click="cancelEditing"
          >
            Cancel
          </Button>
          <!-- Save button removed -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue';
import { CopyIcon } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { Query, QueryGroup } from '@/types/query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Define a common interface for item structure
interface ItemType {
  '@id'?: string;
  name: string;
  description?: string;
}

const props = defineProps({
  item: {
    type: Object as PropType<ItemType | null>,
    default: null,
  },
  isCreating: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'update:description', value: string | undefined): void
  // (e: 'save', details: { name: string; description: string | undefined }): void // Save emit removed
  (e: 'cancelCreate'): void
  (e: 'modified', isModified: boolean): void
}>();

const isEditing = ref(props.isCreating || false);
const editedName = ref('');
const editedDescription = ref('');

// Store initial values when editing starts to allow cancellation
const initialNameForEdit = ref('');
const initialDescriptionForEdit = ref('');

const shortId = computed(() => {
  const id = props.item?.['@id'];
  if (!id) return ''; // Return empty if no ID, N/A was for EditableDetailsDisplay
  return id.length > 6 ? `…${id.slice(-6)}` : id;
});

const copyIdToClipboard = async () => {
  if (!props.item?.['@id']) return;
  try {
    await navigator.clipboard.writeText(props.item['@id']);
    toast.success('ID copied to clipboard.');
  } catch (err) {
    console.error('Failed to copy ID: ', err);
    toast.error('Could not copy ID to clipboard.');
  }
};

const initializeEditorState = (currentItem: ItemType | null, forCreating: boolean) => {
  const name = forCreating ? '' : currentItem?.name || '';
  const description = forCreating ? '' : currentItem?.description || '';

  editedName.value = name;
  editedDescription.value = description;

  initialNameForEdit.value = name; // Baseline for "modified" check and cancel
  initialDescriptionForEdit.value = description;

  emit('update:name', editedName.value);
  emit('update:description', editedDescription.value);
  // For a new item being created, it's "modified" from its non-existent state.
  // For an existing item, it's not modified upon initial load.
  emit('modified', forCreating);
};

watch(() => props.item, (newItem) => {
  // Only re-initialize if not in 'isCreating' mode (which has its own watcher)
  // or if the item ID actually changes (to handle selection changes)
  if (!props.isCreating) {
    initializeEditorState(newItem, false);
    isEditing.value = false; // Always exit edit mode when item selection changes externally
  }
}, { immediate: true, deep: true });

watch(() => props.isCreating, (newCreatingState, oldCreatingState) => {
  if (newCreatingState) {
    initializeEditorState(null, true); // Clear fields for new item
    isEditing.value = true;
  } else {
    // If exiting creating mode (e.g., parent cancelled or saved)
    // and no item is selected (meaning creation was cancelled without save)
    if (oldCreatingState && !props.item) {
        isEditing.value = false;
        initializeEditorState(null, false); // Reset fields, not modified
    }
    // If an item *was* created, the props.item watcher will handle setting isEditing to false.
  }
}, { immediate: true });


const startEditing = () => {
  if (!props.item) return; // Should not happen if button is shown correctly
  // Set initial values for cancellation from the current props.item
  initialNameForEdit.value = props.item?.name || '';
  initialDescriptionForEdit.value = props.item?.description || '';
  // Ensure edited values also reflect current item before editing starts
  editedName.value = initialNameForEdit.value;
  editedDescription.value = initialDescriptionForEdit.value;

  isEditing.value = true;
  emit('modified', false); // Not modified yet, user hasn't typed
};

const cancelEditing = () => {
  if (props.isCreating) {
    emit('cancelCreate'); // Parent handles full state reset for creation
  } else {
    // Revert to stored initial values for this edit session
    editedName.value = initialNameForEdit.value;
    editedDescription.value = initialDescriptionForEdit.value;
    isEditing.value = false;
    // Emit updates so parent knows the values reverted
    emit('update:name', editedName.value);
    emit('update:description', editedDescription.value);
    emit('modified', false); // No longer modified as changes are reverted
  }
};

// saveChanges method removed

const handleInput = () => {
  if (isEditing.value) {
    emit('update:name', editedName.value);
    emit('update:description', editedDescription.value);
    const isActuallyModified = initialNameForEdit.value !== editedName.value ||
                             initialDescriptionForEdit.value !== editedDescription.value;
    emit('modified', isActuallyModified);
  }
};

// Expose methods for parent components
defineExpose({
  // save method removed
  prepareNewQueryState: () => {
    initializeEditorState(null, true); // isCreating will be true, so this sets up for new
    isEditing.value = true;
  }
});

</script>
