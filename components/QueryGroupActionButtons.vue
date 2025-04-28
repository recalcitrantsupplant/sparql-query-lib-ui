<template>
  <div class="flex items-center gap-2 flex-shrink-0">
    <Button
      @click="$emit('startCreatingGroup')"
      :disabled="!selectedLibraryId || isSaving"
      class="bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 h-auto w-20 rounded"
      title="Create a new query group in the selected library"
    >
      New
    </Button>
    <Button
      @click="handleSaveClick"
      class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 h-auto w-20 rounded"
      :title="saveButtonTitle"
      :disabled="!selectedLibraryId || isSaving || !selectedGroup || !isGroupModified"
    >
      {{ isSaving ? 'Saving...' : 'Save' }}
    </Button>
    <Button
      @click="$emit('deleteGroup')"
      :disabled="!selectedGroup || isSaving"
      variant="destructive"
      class="px-2 py-1 h-auto w-20 rounded"
      title="Delete the selected query group"
    >
      Delete
    </Button>
    <Button
      @click="$emit('discardChanges')"
      :disabled="!isGroupModified || isSaving"
      variant="outline"
      class="px-2 py-1 h-auto w-20 rounded"
      title="Discard unsaved changes"
    >
      Discard
    </Button>

    <!-- Removed Missing Name Alert Dialog as validation is handled elsewhere -->
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { QueryGroup } from '@/types/query'; // Assuming QueryGroup type exists
// Removed import for QueryGroupDetailsEditor as the ref is no longer needed

const props = defineProps<{
  selectedLibraryId: string | null; // Assuming library context is needed
  isSaving: boolean;
  selectedGroup: QueryGroup | null;
  // queryGroupDetailsEditorRef prop removed
  isGroupModified: boolean;
  saveButtonTitle: string;
}>();

const emit = defineEmits(['startCreatingGroup', 'saveGroup', 'deleteGroup', 'discardChanges']);

// const showMissingNameAlert = ref(false); // No longer needed here

const handleSaveClick = () => {
  // Validation is now handled within QueryGroupDetailsDisplay before its @save event.
  // This button now directly triggers the saveGroup event, assuming validation passed elsewhere
  // or this button is primarily for canvas-only saves (which might need separate validation).
  // For now, just emit the event.
  emit('saveGroup');
};
</script>
