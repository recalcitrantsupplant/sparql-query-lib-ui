<template>
  <div class="my-3 flex items-center gap-2">
    <Button
      @click="$emit('executeQuery')"
      :disabled="!canExecute"
      :class="[
        'px-4 py-2 rounded', // Base padding and rounding
        canExecute
          ? 'bg-blue-500 text-white hover:bg-blue-600' // Enabled: Blue background, white text, darker blue on hover
          : 'bg-gray-300 text-gray-500 cursor-not-allowed' // Disabled: Gray background, gray text, not-allowed cursor
      ]"
    >
      Execute Query
    </Button>
    <!-- Curl Command Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="outline"
          :disabled="!canExecute"
          class="px-4 py-2 rounded"
          title="Show cURL command options"
        >
          Show cURL
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down ml-1 h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @click="$emit('displayCurlCommandWithOptions', { includeArgs: false })">
          Show cURL (Base)
        </DropdownMenuItem>
        <DropdownMenuItem @click="$emit('displayCurlCommandWithOptions', { includeArgs: true })">
          Show cURL (With Arguments)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Execution Backend Selector -->
    <Select :modelValue="selectedBackendId" @update:modelValue="$emit('update:selectedBackendId', $event)" :disabled="isLoadingBackends || executionBackends.length === 0">
      <SelectTrigger class="w-[250px]">
        <SelectValue placeholder="Select Execution Backend" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-if="isLoadingBackends" value="loading" disabled>Loading backends...</SelectItem>
        <SelectItem v-else-if="errorBackends" value="error" disabled>Error loading</SelectItem>
        <SelectItem v-else-if="executionBackends.length === 0" value="none" disabled>No backends configured</SelectItem>
        <SelectItem
          v-for="backend in executionBackends"
          :key="backend['@id']"
          :value="backend['@id']"
        >
          {{ backend.name }} ({{ backend.backendType }})
        </SelectItem>
      </SelectContent>
    </Select>
    <!-- Media Type Selector -->
    <Select :modelValue="selectedMediaType" @update:modelValue="$emit('update:selectedMediaType', $event)">
      <SelectTrigger class="w-[200px]">
        <SelectValue placeholder="Select Media Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="mediaType in mediaTypes"
          :key="mediaType.value"
          :value="mediaType.value"
        >
          {{ mediaType.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <span v-if="isLoadingBackends" class="text-xs text-gray-500 italic">Loading...</span>
    <span v-else-if="errorBackends" class="text-xs text-red-500 italic">Error</span>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import type { ExecutionBackend } from '@/composables/useExecutionBackendsApi';


const props = defineProps<{
  canExecute: boolean;
  isLoadingBackends: boolean;
  executionBackends: ExecutionBackend[];
  errorBackends: string | Error | null; // Updated type to include Error
  selectedBackendId: string | null;
  selectedMediaType: string;
  mediaTypes: { label: string; value: string }[];
}>();

// Update emits to include the new event
const emit = defineEmits(['executeQuery', 'displayCurlCommandWithOptions', 'update:selectedBackendId', 'update:selectedMediaType']);
</script>
