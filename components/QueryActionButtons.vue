<template>
  <div class="flex items-center gap-2 flex-shrink-0">
    <Button
      @click="$emit('startCreatingQuery')"
      :disabled="!selectedLibraryId || isSaving"
      class="bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 h-auto w-20 rounded"
      title="Create a new query in the selected library"
    >
      New
    </Button>
    <Button
      @click="handleSaveClick"
      class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 h-auto w-20 rounded"
       :title="saveButtonTitle"
       :disabled="!selectedLibraryId || isSaving || !isNameValid || !isIdValid || hasParseError || (selectedQuery && !isQueryModified)"
     >
       {{ isSaving ? 'Saving...' : 'Save' }}
     </Button>
    <Button
      @click="$emit('deleteQuery')"
      :disabled="!selectedQuery || isSaving"
      variant="destructive"
      class="px-2 py-1 h-auto w-20 rounded"
      title="Delete the selected query"
    >
      Delete
    </Button>
    <Button
      @click="$emit('discardChanges')"
      :disabled="!isQueryModified || isSaving"
      variant="outline"
      class="px-2 py-1 h-auto w-20 rounded"
      title="Discard unsaved changes"
    >
      Discard
    </Button>

    <!-- Missing Name Alert Dialog -->
    <AlertDialog :open="showMissingNameAlert" @update:open="showMissingNameAlert = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Missing Query Name</AlertDialogTitle>
          <AlertDialogDescription>
            A query name must be provided to save the query.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction @click="showMissingNameAlert = false">OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Query } from '@/types/query';
// Removed QueryDetailsEditor and QueryAnalysisSidebar imports

const props = defineProps<{
  selectedLibraryId: string | null;
  isSaving: boolean;
  selectedQuery: Query | null;
  // Removed queryDetailsEditorRef and analysisSidebarRef props
  isQueryModified: boolean;
  saveButtonTitle: string;
  // Add new props for validation state
  isNameValid: boolean;
  isIdValid: boolean;
  hasParseError: boolean;
}>();

const emit = defineEmits(['startCreatingQuery', 'saveQuery', 'deleteQuery', 'discardChanges']);

const showMissingNameAlert = ref(false);

const handleSaveClick = () => {
  // Use the isNameValid prop directly
  if (!props.isNameValid) {
    showMissingNameAlert.value = true;
  } else {
    // Other validations (ID, parse error) are handled by the disabled state
    emit('saveQuery');
  }
};
</script>
