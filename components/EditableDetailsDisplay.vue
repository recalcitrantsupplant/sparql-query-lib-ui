<template>
  <div class="p-4 border rounded mb-4">
    <div class="flex justify-between items-start gap-4">
      <div class="flex-grow space-y-2">
        <div class="flex items-baseline gap-2">
          <label for="item-name" class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">Name:</label>
          <div v-if="!isEditing" class="flex-grow">
            <p class="text-md font-semibold">{{ item?.name || 'Unnamed Item' }}</p>
          </div>
          <div v-else class="flex-grow">
            <Input
              id="item-name"
              v-model="editedName"
              placeholder="Name"
              class="text-md"
              required
            />
            <p v-if="!editedName?.trim()" class="text-xs text-red-600 mt-1">Name is required.</p>
          </div>
        </div>

        <div class="flex items-baseline gap-2">
          <label for="item-description" class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">Description:</label>
          <div v-if="!isEditing" class="flex-grow">
            <p class="text-sm text-gray-600">{{ item?.description || 'No description.' }}</p>
          </div>
          <div v-else class="flex-grow">
            <Textarea
              id="item-description"
              v-model="editedDescription"
              placeholder="Description (optional)"
              class="text-sm"
              rows="2"
            />
          </div>
        </div>
      </div>

      <div class="flex items-start gap-4 flex-shrink-0">
         <div class="flex items-center mt-1">
            <span class="text-xs font-medium text-gray-700 mr-1">ID:</span>
            <!-- Use shortId for display, full ID for title -->
            <span class="text-sm font-mono break-all mr-1" :title="item?.['@id'] || ''">{{ shortId }}</span>
            <Button
              v-if="item?.['@id']"
              variant="ghost"
              size="icon"
              @click="copyIdToClipboard"
              title="Copy ID"
              class="text-gray-500 hover:text-gray-700 h-5 w-5"
            >
              <CopyIcon class="h-3 w-3" />
            </Button>
          </div>

        <div class="flex gap-2">
           <Button
            v-if="!isEditing"
            variant="outline"
            size="sm"
            @click="startEditing"
            :disabled="!item"
          >
            Edit
          </Button>
          <template v-if="isEditing">
            <Button
              variant="secondary"
              size="sm"
              @click="cancelEditing"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              @click="saveChanges"
              :disabled="!editedName?.trim()"
            >
              Save
            </Button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { CopyIcon } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { Query, QueryGroup } from '@/types/query'; // Import Query type
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


interface Props {
  item: Query | QueryGroup | null; // Use union type
  isCreating?: boolean;
}


const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'save', details: { name: string; description: string | undefined }): void
  (e: 'cancelCreate'): void
  (e: 'update:isDirty', value: boolean): void // Add emit for dirty state
}>();

const isEditing = ref(props.isCreating || false);
const editedName = ref('');
const editedDescription = ref('');

// Computed property for shortened ID
const shortId = computed(() => {
  const id = props.item?.['@id'];
  if (!id) {
    return 'N/A';
  }
  if (id.length <= 6) {
    return id;
  }
  return `…${id.slice(-6)}`; // UTF-8 ellipsis
});

// --- Dirty State Tracking ---
const isDirty = computed(() => {
  if (!isEditing.value) {
    return false; // Not dirty if not editing
  }
  // If creating, it's always considered "dirty" until saved/cancelled
  if (props.isCreating) {
    // Check if name or description has *any* value (since initial is empty)
    return !!editedName.value || !!editedDescription.value;
  }
  // If editing existing, compare with original item
  const nameChanged = editedName.value !== (props.item?.name || '');
  const descriptionChanged = editedDescription.value !== (props.item?.description || '');
  return nameChanged || descriptionChanged;
});

// Emit the dirty state whenever it changes
watch(isDirty, (newValue) => {
  emit('update:isDirty', newValue);
});
// --- End Dirty State Tracking ---


const initializeEditor = (resetDirty = true) => {
  editedName.value = props.item?.name || '';
  editedDescription.value = props.item?.description || '';
  // Explicitly emit false dirty state after initialization if requested
  if (resetDirty) {
     emit('update:isDirty', false);
  }
};

watch(() => props.item, (newItem, oldItem) => {
  // Only re-initialize if not currently editing OR if the item ID actually changes
  // This prevents resetting the editor if the parent passes the same item object again
  if (!isEditing.value || newItem?.['@id'] !== oldItem?.['@id']) {
    initializeEditor(); // This will also reset dirty state via the computed/watch
  }
  // If item becomes null (and not in create mode), ensure editing mode is exited
  if (!newItem && !props.isCreating) {
      isEditing.value = false; // This will trigger isDirty computed to become false
  }
}, { immediate: true, deep: true }); // Use deep watch just in case parent mutates prop internally


// Watcher for the item prop
watch(() => props.item, (newItem, oldItem) => {
  // Only re-initialize fields if the item ID actually changes or if item becomes null/non-null
  const itemIdChanged = newItem?.['@id'] !== oldItem?.['@id'];
  const itemPresenceChanged = (!newItem && oldItem) || (newItem && !oldItem);

  if (itemIdChanged || itemPresenceChanged) {
    // Initialize editor fields with the new item's data
    initializeEditor(); // Resets fields and potentially dirty state

    // If the item changed AND we are not flagged as 'creating',
    // ensure we are NOT in editing mode. This handles switching items.
    if (!props.isCreating) {
        isEditing.value = false;
        console.log('EditableDetailsDisplay: Item changed and not creating, ensuring non-edit mode.');
    }
  }
}, { immediate: true, deep: true }); // Keep deep watch for safety

// Watcher for the isCreating prop
watch(() => props.isCreating, (newVal, oldVal) => {
    if (newVal) {
        // Entering create mode: ensure we are editing and fields are ready (empty)
        initializeEditor(false); // Initialize fields (will be empty as item is null), don't reset dirty yet
        isEditing.value = true;
        console.log('EditableDetailsDisplay: isCreating=true, entering edit mode.');
    } else if (oldVal && !newVal) {
        // Exiting create mode (e.g., parent cancelled or saved).
        // If an item was just created and passed back, the item watcher above
        // should have already set isEditing = false.
        // If creation was cancelled and item is null, we also ensure editing is false.
        if (!props.item) { // If cancelled and no item selected
             isEditing.value = false;
             console.log('EditableDetailsDisplay: isCreating=false, no item, exiting edit mode.');
        } else {
             // If an item exists (likely just created), the item watcher handles setting isEditing=false.
             console.log('EditableDetailsDisplay: isCreating=false, item exists, item watcher should handle edit mode.');
        }
    }
}, { immediate: true });


const startEditing = () => {
  if (!props.item) return;
  initializeEditor(false); // Initialize fields, but don't reset dirty state yet
  isEditing.value = true;
  // isDirty will be calculated based on comparison; emit false initially
  emit('update:isDirty', false);
};

const cancelEditing = () => {
  const wasDirty = isDirty.value; // Check dirty state *before* resetting
  if (props.isCreating) {
    emit('cancelCreate'); // Parent handles state reset
    // isEditing might be set to false by parent via props, which resets dirty state
  } else {
    initializeEditor(false); // Reset fields to original values
    isEditing.value = false; // Exit editing mode
  }
  // Explicitly emit false dirty state after cancelling
  if (wasDirty) {
      emit('update:isDirty', false);
  }
};

const saveChanges = () => {
  if (!editedName.value?.trim()) return;
  emit('save', {
    name: editedName.value,
    description: editedDescription.value || undefined,
  });
  // isEditing is set to false AFTER the save is confirmed by the parent (implicitly via props.item update)
  // We don't set isEditing.value = false here directly anymore.
  // The dirty state will become false once props.item updates and matches the editor fields.
  return true; // Indicate save was initiated (validation passed)
};

// Expose the save method for programmatic triggering
defineExpose({
  save: saveChanges
});

const copyIdToClipboard = async () => {
  if (!props.item?.['@id']) return; // Check item instead of group
  try {
    await navigator.clipboard.writeText(props.item['@id']);
    toast.success('ID copied to clipboard.', { duration: 2000 }); // Generic message
  } catch (err) {
    console.error('Failed to copy ID: ', err);
    toast.error('Could not copy ID to clipboard.', { duration: 3000 });
  }
};
</script>
