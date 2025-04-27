<template>
  <div class="p-4">
    <NuxtLink to="/queries" class="flex items-center text-blue-600 hover:text-blue-800 mb-4 text-sm">
      <span class="mr-1 text-lg">←</span> Back to Queries
    </NuxtLink>
    <h1 class="text-2xl font-bold mb-4">Admin / Configuration</h1>

    <div class="mb-6 p-4 border rounded shadow-sm">
      <h2 class="text-lg font-semibold mb-2">Query Library HTTP Server</h2>
      <label for="api-url" class="block text-sm font-medium text-gray-700 mb-1">
        Backend API Base URL:
      </label>
      <input
        id="api-url"
        v-model="localApiUrl"
        type="text"
        placeholder="e.g., http://localhost:3000"
        class="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
      <button
        @click="saveSettings"
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Save API URL
      </button>
       <p v-if="savedMessage" class="text-sm text-green-600 mt-2">{{ savedMessage }}</p>
    </div>

    <hr class="my-6"/>

    <div>
      <h2 class="text-lg font-semibold mb-4">Execution Backends</h2>

      <div class="mb-4">
        <button
          @click="showAddForm = !showAddForm; addError = null"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {{ showAddForm ? 'Cancel Adding' : 'Add New Backend' }}
        </button>
      </div>

      <!-- Add Backend Form (conditionally rendered) -->
      <div v-if="showAddForm" class="mb-6 p-4 border rounded shadow-sm bg-gray-50">
        <h3 class="text-md font-semibold mb-3">Add New Execution Backend</h3>
        <form @submit.prevent="handleAddBackend">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="add-backend-name" class="block text-sm font-medium text-gray-700">Name *</label>
              <input type="text" id="add-backend-name" v-model="newBackend.name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div>
              <label for="add-backend-type" class="block text-sm font-medium text-gray-700">Backend Type *</label>
              <select id="add-backend-type" v-model="newBackend.backendType" required class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <option value="HTTP">HTTP SPARQL Endpoint</option>
                <option value="OxigraphMemory">In-Memory (Oxigraph)</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label for="add-backend-desc" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="add-backend-desc" v-model="newBackend.description" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
            <div v-if="newBackend.backendType === 'HTTP'">
              <label for="add-backend-endpoint" class="block text-sm font-medium text-gray-700">Endpoint URL *</label>
              <input type="url" id="add-backend-endpoint" v-model="newBackend.endpoint" :required="newBackend.backendType === 'HTTP'" placeholder="http://example.com/sparql" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div v-if="newBackend.backendType === 'HTTP'">
              <label for="add-backend-username" class="block text-sm font-medium text-gray-700">Username (Optional)</label>
              <input type="text" id="add-backend-username" v-model="newBackend.username" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div v-if="newBackend.backendType === 'HTTP'" class="md:col-span-2">
              <label for="add-backend-password" class="block text-sm font-medium text-gray-700">Password (Optional)</label>
              <input type="password" id="add-backend-password" v-model="newBackend.password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
          </div>

          <p v-if="addError" class="text-sm text-red-600 mt-3">{{ addError }}</p>

          <div class="mt-4 flex justify-end space-x-2">
            <button type="button" @click="showAddForm = false; addError = null" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              Cancel
            </button>
            <button type="submit" :disabled="loading" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {{ loading ? 'Saving...' : 'Save Backend' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Edit Backend Form (conditionally rendered) -->
      <div v-if="showEditForm && editingBackend" class="mb-6 p-4 border rounded shadow-sm bg-gray-50">
        <h3 class="text-md font-semibold mb-3">Edit Execution Backend: {{ editingBackend.name }}</h3>
        <form @submit.prevent="handleUpdateBackend">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label :for="'edit-backend-name-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Name *</label>
              <input type="text" :id="'edit-backend-name-' + editingBackend['@id']" v-model="editFormData.name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div>
              <label :for="'edit-backend-type-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Backend Type *</label>
              <select :id="'edit-backend-type-' + editingBackend['@id']" v-model="editFormData.backendType" required class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <option value="HTTP">HTTP SPARQL Endpoint</option>
                <option value="OxigraphMemory">In-Memory (Oxigraph)</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label :for="'edit-backend-desc-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea :id="'edit-backend-desc-' + editingBackend['@id']" v-model="editFormData.description" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
            <div v-if="editFormData.backendType === 'HTTP'">
              <label :for="'edit-backend-endpoint-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Endpoint URL *</label>
              <input type="url" :id="'edit-backend-endpoint-' + editingBackend['@id']" v-model="editFormData.endpoint" :required="editFormData.backendType === 'HTTP'" placeholder="http://example.com/sparql" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div v-if="editFormData.backendType === 'HTTP'">
              <label :for="'edit-backend-username-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Username (Optional - Enter to update)</label>
              <input type="text" :id="'edit-backend-username-' + editingBackend['@id']" v-model="editFormData.username" placeholder="Leave blank to keep existing" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div v-if="editFormData.backendType === 'HTTP'" class="md:col-span-2">
              <label :for="'edit-backend-password-' + editingBackend['@id']" class="block text-sm font-medium text-gray-700">Password (Optional - Enter to update)</label>
              <input type="password" :id="'edit-backend-password-' + editingBackend['@id']" v-model="editFormData.password" placeholder="Leave blank to keep existing" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
          </div>

          <p v-if="editError" class="text-sm text-red-600 mt-3">{{ editError }}</p>

          <div class="mt-4 flex justify-end space-x-2">
            <button type="button" @click="showEditForm = false; editingBackend = null; editError = null" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              Cancel
            </button>
            <button type="submit" :disabled="loading" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {{ loading ? 'Saving...' : 'Update Backend' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Backend List -->
      <div v-if="loading && !showAddForm && !showEditForm" class="text-center text-gray-500">Loading backends...</div>
      <div v-else-if="error && !showAddForm && !showEditForm" class="text-center text-red-500">Error loading backends: {{ error.message }}</div>
      <div v-else-if="backends.length === 0 && !showAddForm && !showEditForm" class="text-center text-gray-500">No execution backends found.</div>

      <div v-else-if="backends.length > 0" class="overflow-x-auto border rounded">
        <!-- Hide list while editing to avoid confusion -->
        <table v-if="!showEditForm" class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="backend in backends" :key="backend['@id']">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ backend.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ backend.backendType }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ backend.endpoint || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  @click="startEditBackend(backend)"
                  class="text-indigo-600 hover:text-indigo-900"
                >
                  Edit
                </button>
                <button
                  @click="handleDeleteBackend(backend['@id'], backend.name)"
                  class="text-red-600 hover:text-red-900"
                  :disabled="loading"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- TODO: Add Create/Edit/Delete Backend forms/modals -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue' // Added reactive, nextTick
import { useSettings } from '@/composables/useSettings' // Corrected path
import { useExecutionBackendsApi, type ExecutionBackend, type CreateBackendBody, type UpdateBackendBody } from '@/composables/useExecutionBackendsApi' // Corrected path, added CreateBackendBody, UpdateBackendBody

const { apiUrl, setApiUrl } = useSettings()
const { backends, loading, error, fetchBackends, createBackend, updateBackend, deleteBackend } = useExecutionBackendsApi() // Use the composable

// Local ref for the input field
const localApiUrl = ref('')
const savedMessage = ref('')

// State for Add Backend Form
const showAddForm = ref(false)
const newBackend = reactive({
  name: '',
  description: '',
  endpoint: '',
  backendType: 'HTTP' as 'HTTP' | 'OxigraphMemory', // Default to HTTP
  username: '',
  password: ''
})
const addError = ref<string | null>(null)

// State for Edit Backend Form
const showEditForm = ref(false)
const editingBackend = ref<ExecutionBackend | null>(null) // To store the backend being edited
const editFormData = reactive<Partial<UpdateBackendBody>>({}) // To hold form data during edit
const editError = ref<string | null>(null)

// Initialize local state and fetch backends when component mounts (client-side)
onMounted(async () => {
  localApiUrl.value = apiUrl.value
  await fetchBackends() // Fetch backends on mount
})

const saveSettings = () => {
  setApiUrl(localApiUrl.value)
  // Update local ref to reflect potential validation/trimming in setApiUrl
  localApiUrl.value = apiUrl.value
  // Provide feedback
  savedMessage.value = `API URL saved: ${apiUrl.value}`
  // Clear message after a few seconds
  setTimeout(() => { savedMessage.value = '' }, 3000)
  console.log('Settings saved. New API URL:', apiUrl.value)
}

// Function to handle adding a new backend
const handleAddBackend = async () => {
  addError.value = null // Clear previous errors
  // Basic validation
  if (!newBackend.name || !newBackend.backendType) {
    addError.value = 'Name and Backend Type are required.'
    return
  }
  if (newBackend.backendType === 'HTTP' && !newBackend.endpoint) {
     addError.value = 'Endpoint is required for HTTP backends.'
     return
  }

  // Clear non-applicable fields based on type
  if (newBackend.backendType === 'OxigraphMemory') {
    newBackend.endpoint = ''; // Endpoint not used for OxigraphMemory
    newBackend.username = '';
    newBackend.password = '';
  }

  const result = await createBackend({ ...newBackend });
  if (result) {
    showAddForm.value = false; // Hide form on success
    // Reset form
    Object.assign(newBackend, { name: '', description: '', endpoint: '', backendType: 'HTTP', username: '', password: '' });
  } else {
    // Error message is handled by the alert in the composable for now
    // Could set addError.value here if composable didn't alert
    addError.value = error.value?.message || 'Failed to create backend. Check console/API logs.';
  }
}

// Function to handle deleting a backend
const handleDeleteBackend = async (backendId: string, backendName: string) => {
  // Use window.confirm for a simple confirmation dialog
  if (window.confirm(`Are you sure you want to delete the backend "${backendName}"? This action cannot be undone.`)) {
    const success = await deleteBackend(backendId);
    if (!success) {
      // Error message is handled by the alert in the composable, but we can show a fallback
       alert(error.value?.message || `Failed to delete backend "${backendName}". Check console/API logs.`);
    }
    // List will refresh automatically due to fetchBackends() in the composable's delete function
  }
}

// Function to initiate editing a backend
const startEditBackend = (backend: ExecutionBackend) => {
  editingBackend.value = backend;
  // Populate form data - only include fields relevant to UpdateBackendBody
  // Note: Password is intentionally omitted - editing passwords might require a different flow
  editFormData.name = backend.name;
  editFormData.description = backend.description || '';
  editFormData.endpoint = backend.endpoint || '';
  editFormData.backendType = backend.backendType;
  // Clear username/password from edit form data initially
  editFormData.username = ''; // Or fetch if available and needed for update? API spec unclear.
  editFormData.password = ''; // Password should likely not be pre-filled for editing.

  editError.value = null; // Clear previous edit errors
  showAddForm.value = false; // Hide add form if open
  showEditForm.value = true; // Show edit form
}

// Function to handle updating an existing backend
const handleUpdateBackend = async () => {
  if (!editingBackend.value) {
    editError.value = 'No backend selected for editing.';
    return;
  }

  editError.value = null; // Clear previous errors

  // Basic validation
  if (!editFormData.name || !editFormData.backendType) {
    editError.value = 'Name and Backend Type are required.';
    return;
  }
  if (editFormData.backendType === 'HTTP' && !editFormData.endpoint) {
     editError.value = 'Endpoint is required for HTTP backends.';
     return
  }

  // Prepare the data payload, removing empty optional fields
  const updatePayload: UpdateBackendBody = {
    name: editFormData.name,
    description: editFormData.description || undefined, // Send undefined if empty
    endpoint: editFormData.backendType === 'HTTP' ? editFormData.endpoint : undefined,
    backendType: editFormData.backendType,
    username: editFormData.username || undefined, // Send undefined if empty
    password: editFormData.password || undefined, // Send undefined if empty
  };

   // Clear non-applicable fields based on type before sending
  if (updatePayload.backendType === 'OxigraphMemory') {
    updatePayload.endpoint = undefined;
    updatePayload.username = undefined;
    updatePayload.password = undefined;
  }


  const result = await updateBackend(editingBackend.value['@id'], updatePayload);
  if (result) {
    showEditForm.value = false; // Hide form on success
    editingBackend.value = null; // Clear editing state
    // Reset form data (optional, as it's cleared when starting edit)
    Object.assign(editFormData, { name: '', description: '', endpoint: '', backendType: 'HTTP', username: '', password: '' });
  } else {
    // Error message is handled by the alert in the composable
    editError.value = error.value?.message || 'Failed to update backend. Check console/API logs.';
  }
}

// Keep local state in sync if the composable value changes elsewhere (optional)
// watch(apiUrl, (newVal) => {
//   localApiUrl.value = newVal
// })
</script>
