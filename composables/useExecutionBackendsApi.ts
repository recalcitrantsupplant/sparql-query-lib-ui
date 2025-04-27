import { ref, computed } from 'vue';
import { useSettings } from '@/composables/useSettings';

// Define the structure of an Execution Backend based on the OpenAPI spec (def-2)
export interface ExecutionBackend {
  '@id': string;
  '@type': 'Backend';
  name: string;
  description?: string;
  endpoint?: string; // Optional for OxigraphMemory? Check spec/implementation
  backendType: 'HTTP' | 'OxigraphMemory';
  'http://schema.org/dateCreated': string;
  'http://schema.org/dateModified': string;
}

// Define the structure for creating a backend (def-4)
export interface CreateBackendBody { // Added export
  name: string;
  description?: string;
  endpoint?: string; // Required for HTTP, not for OxigraphMemory? API should validate.
  backendType: 'HTTP' | 'OxigraphMemory';
  username?: string; // Optional
  password?: string; // Optional
}

// Define the structure for updating a backend (def-3)
export interface UpdateBackendBody { // Added export
  name?: string;
  description?: string;
  endpoint?: string;
  backendType?: 'HTTP' | 'OxigraphMemory';
  username?: string; // Assuming these might be updatable, though not explicitly in def-3
  password?: string; // Assuming these might be updatable, though not explicitly in def-3
}


export function useExecutionBackendsApi() {
  const { apiUrl } = useSettings();
  const backends = ref<ExecutionBackend[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Construct the base URL using the value from settings
  const API_BASE = computed(() => `${apiUrl.value}/api/backends/`); // Added trailing slash

  // Helper to extract ID from full URI
  const extractId = (fullId: string): string => {
    return fullId.includes('/') ? fullId.substring(fullId.lastIndexOf('/') + 1) : fullId;
  }

  // Fetch all backends
  async function fetchBackends() {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch<ExecutionBackend[]>(API_BASE.value);
      backends.value = data;
    } catch (err: any) {
      console.error('Error fetching execution backends:', err);
      error.value = err;
      backends.value = []; // Clear or keep stale data? Clearing for now.
    } finally {
      loading.value = false;
    }
  }

  // Create a new backend
  async function createBackend(backendData: CreateBackendBody): Promise<ExecutionBackend | null> {
    loading.value = true;
    error.value = null;
    try {
      const newBackend = await $fetch<ExecutionBackend>(API_BASE.value, {
        method: 'POST',
        body: backendData,
      });
      await fetchBackends(); // Refetch to update the list
      return newBackend;
    } catch (err: any) {
      console.error('Error creating backend:', err);
      error.value = err;
      if (err.response?._data?.error) {
        alert(`Error creating backend: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while creating the backend.');
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Update an existing backend
  async function updateBackend(id: string, backendData: UpdateBackendBody): Promise<ExecutionBackend | null> {
    const backendId = extractId(id);
    loading.value = true;
    error.value = null;
    try {
      const updatedBackend = await $fetch<ExecutionBackend>(`${API_BASE.value}/${backendId}`, {
        method: 'PUT',
        body: backendData,
      });
      await fetchBackends(); // Refetch for simplicity
      return updatedBackend;
    } catch (err: any) {
      console.error(`Error updating backend ${backendId}:`, err);
      error.value = err;
       if (err.response?._data?.error) {
        alert(`Error updating backend: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while updating the backend.');
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Delete a backend
  async function deleteBackend(id: string): Promise<boolean> {
    const backendId = extractId(id);
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`${API_BASE.value}/${backendId}`, {
        method: 'DELETE',
      });
      await fetchBackends(); // Refetch to update list
      return true;
    } catch (err: any) {
      console.error(`Error deleting backend ${backendId}:`, err);
      error.value = err;
       if (err.response?._data?.error) {
        alert(`Error deleting backend: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while deleting the backend.');
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    backends,
    loading,
    error,
    fetchBackends,
    createBackend,
    updateBackend,
    deleteBackend,
  };
}
