import { ref } from 'vue';
import { useSettings } from '@/composables/useSettings'; // Import useSettings

// Define the structure of a Library based on the OpenAPI spec
// Using '@id' instead of 'id' as per the spec
export interface Library {
  '@id': string;
  '@type': 'Library';
  name: string;
  description?: string; // Optional based on spec
  queries?: { '@id': string }[]; // Optional based on spec
  'http://schema.org/dateCreated': string;
  'http://schema.org/dateModified': string;
}

// Define the structure for creating a library
interface CreateLibraryBody {
  name: string;
  description?: string;
}

// Define the structure for updating a library
interface UpdateLibraryBody {
  name?: string;
  description?: string;
  queries?: { '@id': string }[];
}


export function useLibrariesApi() {
  const { apiUrl } = useSettings(); // Get the apiUrl
  const libraries = ref<Library[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Construct the base URL using the value from settings
  const API_BASE = computed(() => `${apiUrl.value}/api/libraries`);

  // Fetch all libraries
  async function fetchLibraries() {
    loading.value = true;
    error.value = null;
    try {
      // Using Nuxt's $fetch helper with the computed API_BASE
      const data = await $fetch<Library[]>(API_BASE.value);
      libraries.value = data;
    } catch (err: any) {
      console.error('Error fetching libraries:', err);
      error.value = err;
      // Handle error appropriately in UI later
    } finally {
      loading.value = false;
    }
  }

  // Create a new library
  async function createLibrary(libraryData: CreateLibraryBody): Promise<Library | null> {
    loading.value = true;
    error.value = null;
    try {
      const newLibrary = await $fetch<Library>(API_BASE.value, {
        method: 'POST',
        body: libraryData,
      });
      // Add to local list or refetch
      await fetchLibraries(); // Refetch to ensure consistency
      return newLibrary;
    } catch (err: any) {
      console.error('Error creating library:', err);
      error.value = err;
      // Handle error (e.g., duplicate name)
      if (err.response?._data?.error) {
        alert(`Error creating library: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while creating the library.');
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Update an existing library
  async function updateLibrary(id: string, libraryData: UpdateLibraryBody): Promise<Library | null> {
    // Extract the actual ID part if the full @id URI is passed
    const libraryId = id.includes('/') ? id.substring(id.lastIndexOf('/') + 1) : id;
    loading.value = true;
    error.value = null;
    try {
      const updatedLibrary = await $fetch<Library>(`${API_BASE.value}/${libraryId}`, {
        method: 'PUT',
        body: libraryData,
      });
      // Update local list or refetch
      await fetchLibraries(); // Refetch for simplicity
      return updatedLibrary;
    } catch (err: any) {
      console.error(`Error updating library ${libraryId}:`, err);
      error.value = err;
       if (err.response?._data?.error) {
        alert(`Error updating library: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while updating the library.');
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Delete a library
  async function deleteLibrary(id: string): Promise<boolean> {
     // Extract the actual ID part if the full @id URI is passed
    const libraryId = id.includes('/') ? id.substring(id.lastIndexOf('/') + 1) : id;
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`${API_BASE.value}/${libraryId}`, {
        method: 'DELETE',
      });
      // Remove from local list or refetch
      await fetchLibraries(); // Refetch to update list
      return true;
    } catch (err: any) {
      console.error(`Error deleting library ${libraryId}:`, err);
      error.value = err;
       if (err.response?._data?.error) {
        alert(`Error deleting library: ${err.response._data.error}`);
      } else {
        alert('An unexpected error occurred while deleting the library.');
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    libraries,
    loading,
    error,
    fetchLibraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
  };
}
