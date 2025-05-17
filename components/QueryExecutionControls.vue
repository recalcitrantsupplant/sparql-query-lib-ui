<template>
  <div class="my-3">
    <!-- All controls in a single horizontal div for vertical alignment -->
    <div class="flex items-center gap-2">
      <!-- Execute Query Split Button -->
      <div class="inline-flex rounded text-sm font-medium disabled:pointer-events-none disabled:opacity-50 border border-transparent overflow-hidden"
          :class="{ 'cursor-not-allowed': !canExecute, 'border-blue-600': canExecute }">
        <button
          @click="$emit('executeQuery')"
          :disabled="!canExecute"
          :class="[
            'h-8 px-4 flex items-center justify-center rounded-l rounded-r-none text-sm',
            canExecute
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]"
        >
          Execute Query
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              :disabled="!canExecute"
              class="px-2 rounded-r rounded-l-none h-8 flex items-center justify-center w-8 relative"
              :class="[
                canExecute
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
              title="Execution options"
            >
              <div class="absolute left-0 top-1/2 h-4/5 w-px bg-white/20 -translate-y-1/2"></div>
              <ChevronDown class="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              Benchmark
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Benchmark backends
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Curl Command Split Button -->
      <div class="inline-flex rounded text-sm font-medium disabled:pointer-events-none disabled:opacity-50 border border-gray-300 overflow-hidden"
          :class="{ 'cursor-not-allowed': !canExecute }">
        <button
          @click="$emit('displayCurlCommandWithOptions', { includeArgs: false })"
          :disabled="!canExecute"
          class="px-4 rounded-l rounded-r-none h-8 flex items-center justify-center bg-white text-gray-900 hover:bg-gray-100 border-0 text-sm"
          title="Show cURL command"
        >
          Show cURL
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              :disabled="!canExecute"
              class="px-2 rounded-r rounded-l-none h-8 flex items-center justify-center w-8 bg-white text-gray-900 hover:bg-gray-100 border-0 relative"
              title="Show cURL command options"
            >
              <div class="absolute left-0 top-1/2 h-4/5 w-px bg-gray-300 -translate-y-1/2"></div>
              <ChevronDown class="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="$emit('displayCurlCommandWithOptions', { includeArgs: false })">
              Show cURL
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('displayCurlCommandWithOptions', { includeArgs: true })">
              Show cURL (with arguments)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Execution Backend Selector -->
      <Select 
        :modelValue="selectedBackendId" 
        @update:modelValue="$emit('update:selectedBackendId', $event)" 
        :disabled="isLoadingBackends || executionBackends.length === 0"
      >
        <SelectTrigger class="w-[250px] h-8 border border-gray-300">
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
      <Select 
        :modelValue="selectedMediaType" 
        @update:modelValue="$emit('update:selectedMediaType', $event)"
      >
        <SelectTrigger class="w-[200px] h-8 border border-gray-300">
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
      
      <!-- Status Messages -->
      <span v-if="isLoadingBackends" class="text-xs text-gray-500 italic">Loading...</span>
      <span v-else-if="errorBackends" class="text-xs text-red-500 italic">Error</span>
    </div>
  </div>
</template>

<script setup lang="ts">
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
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-vue-next';
import type { ExecutionBackend } from '@/composables/useExecutionBackendsApi';

const props = defineProps<{
  canExecute: boolean;
  isLoadingBackends: boolean;
  executionBackends: ExecutionBackend[];
  errorBackends: string | Error | null;
  selectedBackendId: string | null;
  selectedMediaType: string;
  mediaTypes: { label: string; value: string }[];
}>();

const emit = defineEmits(['executeQuery', 'displayCurlCommandWithOptions', 'update:selectedBackendId', 'update:selectedMediaType']);
</script>