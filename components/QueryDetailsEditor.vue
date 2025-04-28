<template>
  <div class="mb-3 space-y-3"> <!-- Removed border, padding, bg -->
    <!-- Use EditableDetailsDisplay for Name and Description -->
    <EditableDetailsDisplay
      :item="selectedQuery"
      :is-creating="!selectedQuery"
      @save="handleDetailsSave"
      class="border p-3 rounded bg-gray-50"
    />
    <!-- ID Field div removed -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import { CopyIcon } from 'lucide-vue-next'; // Import CopyIcon
import { toast } from 'vue-sonner'; // Import toast
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Textarea import removed as it's no longer used directly
import EditableDetailsDisplay from '@/components/EditableDetailsDisplay.vue'; // Import the new component
import type { Query } from '@/types/query'; // Import Query type

const props = defineProps({
  selectedQuery: {
    type: Object as PropType<Query | null>,
    default: null,
  },
});

// Emit 'modified' when ID changes, or when name/description are saved via the child component
const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'update:description', value: string | undefined): void
  (e: 'update:id', value: string): void
  (e: 'modified', isModified: boolean): void
}>();

// ID related refs and functions removed (editedId, initialId, isValidUri, isIdModified, copyQueryId)
// Handler for the save event from EditableDetailsDisplay
const handleDetailsSave = (details: { name: string; description: string | undefined }) => {
  console.log('QueryDetailsEditor: Received save event from EditableDetailsDisplay', details);
  emit('update:name', details.name);
  emit('update:description', details.description);
  emit('modified', true); // Signal modification when name/desc are saved
};


watch(() => props.selectedQuery, (newSelected) => {
  // No need to handle ID here anymore
  // Name/Description are handled by EditableDetailsDisplay
  emit('modified', false); // Reset modified state when selection changes
}, { immediate: true });

// Watcher for editedId removed

// Expose properties needed by the parent
defineExpose({
  // editedId, isModified, isValidUri removed
  prepareNewQueryState: () => {
    // Name/Description reset handled by EditableDetailsDisplay's internal logic on prop change
    // No need to handle ID reset here
    emit('modified', false); // Reset modified state
    // No need to emit ID update
  }
});

</script>
