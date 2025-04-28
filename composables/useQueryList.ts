import { ref, watch, type Ref } from 'vue';
import type { Query } from '@/types/query';
import { useSettings } from '@/composables/useSettings';

export function useQueryList(selectedLibraryId: Ref<string | null>) {
  const { apiUrl } = useSettings();
  const queries = ref<Query[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchQueries = async (libraryId: string | null) => {
    if (!libraryId) {
      queries.value = [];
      error.value = null;
      isLoading.value = false;
      console.log('useQueryList: No library selected, clearing queries.');
      return;
    }

    isLoading.value = true;
    error.value = null;
    console.log(`useQueryList: Fetching queries for library: ${libraryId}`);

    try {
      // Construct the URL similar to ResourceList
      const url = `${apiUrl.value}/api/queries?libraryId=${encodeURIComponent(libraryId)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      // Assuming the API returns an array of queries directly or within a property
      // Adjust based on the actual API response structure if needed
      queries.value = Array.isArray(data) ? data : (data?.items || []); // Example adjustment
      console.log(`useQueryList: Fetched ${queries.value.length} queries.`);

    } catch (err: any) {
      console.error('useQueryList: Error fetching queries:', err);
      error.value = err.message || 'Failed to fetch queries';
      queries.value = []; // Clear queries on error
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for changes in the selected library ID and refetch
  watch(selectedLibraryId, (newId) => {
    fetchQueries(newId);
  }, { immediate: true }); // Fetch immediately when the composable is used

  return {
    queries,
    isLoading,
    error,
    fetchQueries, // Expose fetch function if manual refresh is needed
  };
}
