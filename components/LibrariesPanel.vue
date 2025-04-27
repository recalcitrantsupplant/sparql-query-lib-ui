<template>
  <div class="libraries-panel p-4 border-r border-gray-300 flex flex-col">
    <!-- Header and Expander Toggle -->
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold">Library</h2>
      <Button @click="toggleExpand" variant="ghost" size="sm">
        {{ isExpanded ? 'Collapse' : 'Manage' }}
        <!-- Consider adding a chevron icon later -->
      </Button>
    </div>

    <!-- Current Library Display (Always Visible) -->
    <div v-if="selectedLibrary" class="mb-2 p-2 border border-blue-200 bg-blue-50 rounded text-sm cursor-default" :title="selectedLibrary.name">
      <span class="font-medium">Current:</span> {{ selectedLibrary.name }}
    </div>
    <div v-else class="mb-2 p-2 border border-gray-200 bg-gray-50 rounded text-gray-500 text-sm cursor-default">
      No library selected.
    </div>

    <!-- Collapsible Management Section -->
    <transition name="slide-fade">
      <div v-show="isExpanded" class="flex flex-col flex-grow mt-4 border-t pt-4 overflow-hidden"> <!-- Added overflow-hidden for transition -->
        <!-- Library List -->
        <h3 class="text-lg font-medium mb-2">Switch / Edit</h3>
         <!-- Loading State -->
      <div v-if="loading" class="text-center text-gray-500 py-4">Loading libraries...</div>
      <!-- Error State -->
      <div v-else-if="error" class="text-center text-red-500 py-4">Error loading libraries.</div>
      <!-- Library List -->
      <ul v-else class="flex-grow overflow-y-auto space-y-2 mb-4 pr-2 max-h-48"> <!-- Added max-height for scroll -->
        <li v-for="library in libraries" :key="library['@id']" class="flex items-center justify-between p-2 border rounded hover:bg-gray-50" :class="{ 'bg-blue-100 border-blue-300': library['@id'] === selectedLibraryId }">
          <span class="truncate flex-grow mr-2" :title="library.name">{{ library.name }}</span>
          <div class="flex space-x-1 flex-shrink-0">
            <Button
              v-if="library['@id'] !== selectedLibraryId"
              @click="selectLibrary(library['@id'])"
              size="sm"
              variant="outline"
              :disabled="loading"
            >
              Select
            </Button>
            <Button @click="editLibrary(library['@id'])" size="sm" variant="ghost" title="Edit Name" :disabled="loading">✏️</Button>
            <Button @click="deleteLibrary(library['@id'])" size="sm" variant="ghost" class="text-red-500 hover:text-red-700" title="Delete Library" :disabled="loading">🗑️</Button>
          </div>
        </li>
        <li v-if="libraries.length === 0 && !loading" class="text-gray-500 italic">
          No libraries found. Create one below.
        </li>
      </ul>

      <!-- Create New Library Section -->
      <div class="mt-auto pt-4 border-t border-gray-200">
        <h3 class="text-lg font-medium mb-2">Create New</h3>
        <div class="flex items-center space-x-2">
          <Input type="text" v-model="newLibraryName" placeholder="New library name..." class="flex-grow" @keyup.enter="handleCreateLibrary" :disabled="loading" />
          <Button @click="handleCreateLibrary" :disabled="loading || !newLibraryName.trim()">
            {{ loading ? 'Creating...' : 'Create' }}
          </Button>
        </div>
         <!-- Display create/update/delete errors -->
         <p v-if="error" class="text-red-500 text-sm mt-1">{{ error.message }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue' // Keep ref for newLibraryName and isExpanded
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLibrariesApi, type Library } from '@/composables/useLibrariesApi'
import { useSettings } from '@/composables/useSettings' // Import settings composable

// --- Settings State ---
const { selectedLibraryId, setSelectedLibraryId } = useSettings()

// --- API Integration ---
const {
  libraries,
  loading,
  error,
  fetchLibraries,
  createLibrary: apiCreateLibrary,
  updateLibrary: apiUpdateLibrary,
  deleteLibrary: apiDeleteLibrary,
} = useLibrariesApi()

// const selectedLibraryId = ref<string | null>(null) // Removed: Now using global state from useSettings
const isExpanded = ref(false) // State for expander, default closed
const newLibraryName = ref('')
// --- End API Integration ---


const selectedLibrary = computed(() => {
  // Use '@id' from the API data
  return libraries.value.find(lib => lib['@id'] === selectedLibraryId.value)
})

// Fetch libraries when the component mounts
onMounted(async () => {
  await fetchLibraries()
  // Optionally select the first library if none is selected and list is not empty
  if (!selectedLibraryId.value && libraries.value.length > 0) {
    // Check if a previously selected ID exists in local storage or similar
    // For now, just select the first one
    // selectLibrary(libraries.value[0]['@id']); // Don't auto-select initially, let user choose
  }
})


function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

async function handleCreateLibrary() {
  const trimmedName = newLibraryName.value.trim()
  if (!trimmedName) {
    alert('Please enter a library name.')
    return;
  }

  // Optional: Client-side check for duplicate names before API call
  // if (libraries.value.some(lib => lib.name.toLowerCase() === trimmedName.toLowerCase())) {
  //    alert(`A library named "${trimmedName}" already exists.`)
  //    return;
  // }

  const newLibrary = await apiCreateLibrary({ name: trimmedName });
  if (newLibrary) {
    console.log('Created library:', newLibrary.name);
    newLibraryName.value = ''; // Clear input
    // Select the newly created library and collapse
    setSelectedLibraryId(newLibrary['@id']); // Use global setter
    isExpanded.value = false // Ensure collapse after creation + selection
  }
  // Error handling is done within the composable (shows alert)
}

function selectLibrary(id: string | null) { // Allow null
  setSelectedLibraryId(id) // Use global state setter
  console.log('Selected library:', id)
  if (id) {
    isExpanded.value = false // Collapse after selecting
    // No longer need TODO here, state is global
  } else {
     // Handle deselection if needed
     console.log('Library deselected.')
  }
}

async function editLibrary(id: string) {
  const library = libraries.value.find(lib => lib['@id'] === id)
  if (!library) return;

  const newName = prompt(`Enter new name for library "${library.name}":`, library.name)
  const trimmedNewName = newName?.trim()

  if (trimmedNewName && trimmedNewName !== library.name) {
     // Optional: Client-side check for duplicate names before API call
     // if (libraries.value.some(lib => lib['@id'] !== id && lib.name.toLowerCase() === trimmedNewName.toLowerCase())) {
     //    alert(`Another library named "${trimmedNewName}" already exists.`)
     //    return;
     // }
    const updatedLibrary = await apiUpdateLibrary(id, { name: trimmedNewName });
    if (updatedLibrary) {
        console.log(`Renamed library ${id} to ${trimmedNewName}`)
        // If the currently selected library was renamed, update the display (already handled by reactivity)
    }
    // Error handling is done within the composable
  }
}

async function deleteLibrary(id: string) {
  const library = libraries.value.find(lib => lib['@id'] === id)
  if (!library) return;

  if (confirm(`Are you sure you want to delete library "${library.name}"? This cannot be undone.`)) {
    const wasSelected = selectedLibraryId.value === id;
    const success = await apiDeleteLibrary(id);

    if (success) {
        console.log('Deleted library:', id)
        // If the deleted library was selected, select another one or none
        if (wasSelected) {
          if (libraries.value.length > 0) {
            // Don't automatically select another one, let the user choose
            setSelectedLibraryId(null); // Deselect using global setter
            // isExpanded.value = true; // Keep panel open? Or close? Decide UX.
          } else {
            setSelectedLibraryId(null); // Deselect using global setter
            isExpanded.value = false // Collapse as there's nothing to manage
            console.log('No libraries remaining.')
            // TODO: Handle state when no libraries are left
          }
        }
        // If a different library was deleted, the panel can stay open
    }
     // Error handling is done within the composable
  }
}
</script>

<style scoped>
/* Scoped styles can remain minimal as Tailwind handles most styling */
.libraries-panel {
  /* Adjust min-width if needed, or let content define width */
   min-width: 200px;
}

/* Add transition for smoother expand/collapse */
.slide-fade-enter-active {
  transition: all 0.2s ease-out; /* Slightly faster */
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); /* Slightly faster */
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  /* transform: translateY(-10px); */ /* Removed Y transform for simpler fade/height */
  max-height: 0; /* Animate height */
  opacity: 0;
  padding-top: 0; /* Animate padding */
  margin-top: 0; /* Animate margin */
  overflow: hidden; /* Keep content clipped */
}

/* Need to define the 'enter-to' state explicitly when animating height */
.slide-fade-enter-to {
  max-height: 500px; /* Adjust to a reasonable max height or calculate dynamically if needed */
  opacity: 1;
  padding-top: 1rem; /* Match original pt-4 */
  margin-top: 1rem; /* Match original mt-4 */
}
</style>
