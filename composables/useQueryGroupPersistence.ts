import { ref, type Ref, computed, watch } from 'vue';
import type { QueryGroup, QueryNode, QueryEdge } from '@/types/query';
import { useSettings } from '@/composables/useSettings';
// Import component instance types if needed for refs (adjust paths as necessary)
// import type QueryGroupList from '@/components/QueryGroupList.vue';
// import type QueryGroupDetailsEditor from '@/components/QueryGroupDetailsEditor.vue';
// import type QueryGroupCanvas from '@/components/QueryGroupCanvas.vue';

// Define the structure for the data needed to save/update a group
// Based on createQueryGroupBody (def-25) and queryGroup (def-24)
interface QueryGroupSaveData {
  name: string;
  description?: string;
  nodes?: QueryNode[];
  edges?: QueryEdge[];
  startNodeIds?: string[];
  endNodeIds?: string[];
  libraryId?: string; // Added libraryId
  canvasLayout?: string; // Added canvasLayout
  // '@id' is added for PUT requests
  '@id'?: string;
}


export function useQueryGroupPersistence(
  apiUrl: Ref<string>,
  // Add refs for selected group, modified state, and potentially component refs if needed later
  selectedQueryGroup: Ref<QueryGroup | null>,
  // queryGroupListRef: Ref<InstanceType<typeof QueryGroupList> | null>, // Example ref
  // isGroupModified: Ref<boolean>, // Example ref
  prepareNewGroupState: () => void // Function to reset state after delete/save new
) {
  const { selectedLibraryId } = useSettings(); // Keep library context if needed for filtering/UI logic
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const queryGroups = ref<QueryGroup[]>([]); // State to hold fetched groups for the current library context
  const isNewlyCreatedGroupSelected = ref(false); // Flag for newly created group state

  /**
   * Fetches query groups, optionally filtered by library ID.
   * Assumes the API supports GET /api/queryGroups/?libraryId={libraryId}
   * @param libraryId - Optional ID of the library to filter by. If null/undefined, fetches all accessible groups (or based on API default behavior).
   */
  const fetchQueryGroups = async (libraryId?: string | null) => {
    isLoading.value = true;
    error.value = null;
    let url = `${apiUrl.value}/api/queryGroups/`;
    if (libraryId) {
      url += `?libraryId=${encodeURIComponent(libraryId)}`;
      console.log(`Fetching query groups for library: ${libraryId} from: ${url}`);
    } else {
      console.log(`Fetching all query groups from: ${url}`); // Or adjust log if API behavior changes
    }

    try {
      const response = await fetch(url, {
         headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const fetchedGroups = await response.json() as QueryGroup[];
      queryGroups.value = fetchedGroups; // Update the ref with the fetched (potentially filtered) groups
      console.log(`Fetched ${fetchedGroups.length} query groups for library ${libraryId || 'all'}.`);
    } catch (err) {
      console.error(`Error fetching query groups (library: ${libraryId || 'all'}):`, err);
      error.value = err instanceof Error ? err : new Error('An unknown error occurred');
      queryGroups.value = []; // Clear groups on error
    } finally {
      isLoading.value = false;
    }
  };

   /**
   * Fetches a single query group by its ID.
   * Assumes the API supports GET /api/queryGroups/{groupId}
   * @param groupId - The full @id of the query group to fetch.
   */
  const fetchQueryGroupById = async (groupId: string): Promise<QueryGroup | null> => {
    isLoading.value = true;
    error.value = null;
    // Extract the actual ID if the full URI is passed, though the API might handle the full URI directly.
    // Assuming the API endpoint expects just the ID part after the last slash.
    const idPart = groupId.includes('/') ? groupId.substring(groupId.lastIndexOf('/') + 1) : groupId;
    const url = `${apiUrl.value}/api/queryGroups/${encodeURIComponent(idPart)}`;
    console.log(`Fetching query group by ID: ${groupId} from: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        // Handle 404 Not Found specifically
        if (response.status === 404) {
          console.warn(`Query group with ID ${groupId} not found (404).`);
          error.value = new Error(`Query group not found: ${groupId}`);
          return null; // Return null for not found
        }
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const group = await response.json() as QueryGroup;
      console.log('Fetched query group by ID:', group);
      return group;
    } catch (err) {
      console.error(`Error fetching query group by ID (${groupId}):`, err);
      error.value = err instanceof Error ? err : new Error('An unknown error occurred');
      return null; // Return null on other errors
    } finally {
      isLoading.value = false;
    }
  };


  /**
   * Saves (creates or updates) a query group.
   * @param groupData - The data for the query group to save. Must include 'name'.
   *                    If it includes '@id', it will perform an update (PUT), otherwise create (POST).
   */
  const saveQueryGroup = async (groupData: QueryGroupSaveData) => {
    // Basic validation
    if (!groupData.name?.trim()) {
      throw new Error('Query Group Name is required.');
    }

    isLoading.value = true;
    error.value = null;

    try {
      let response: Response;
      let url: string;
      let method: 'POST' | 'PUT';
      let body: string;

      if (groupData['@id']) {
        // Update existing group (PUT)
        method = 'PUT';
        url = `${apiUrl.value}/api/queryGroups/${encodeURIComponent(groupData['@id'])}`;
        // PUT expects the full QueryGroup object according to spec (def-24)
        const fullGroupData: QueryGroup = {
            '@id': groupData['@id'],
            '@type': 'QueryGroup', // Add required @type
            name: groupData.name,
            description: groupData.description,
            nodes: groupData.nodes || [], // Ensure arrays exist
            edges: groupData.edges || [],
            startNodeIds: groupData.startNodeIds || [],
            endNodeIds: groupData.endNodeIds || [],
            libraryId: selectedLibraryId.value, // Add libraryId for PUT
            canvasLayout: groupData.canvasLayout, // Add canvasLayout for PUT
        };
        body = JSON.stringify(fullGroupData);
        console.log(`Updating query group: ${url} with libraryId: ${selectedLibraryId.value}`);
      } else {
        // Create new group (POST)
        method = 'POST';
        url = `${apiUrl.value}/api/queryGroups/`;
         // POST expects createQueryGroupBody (def-25), potentially extended with libraryId and canvasLayout
        const createData = { ...groupData, libraryId: selectedLibraryId.value, canvasLayout: groupData.canvasLayout }; // Add libraryId and canvasLayout for POST
        delete createData['@id']; // Ensure @id is not sent for POST
        body = JSON.stringify(createData);
        console.log(`Creating new query group: ${url} with libraryId: ${selectedLibraryId.value}`);
      }

      // Debugging: Log the final body and libraryId before sending
      console.log('Final request body:', body);
      console.log('Value of selectedLibraryId.value at time of request:', selectedLibraryId.value);


      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const savedGroup = await response.json() as QueryGroup;
      console.log('Query group saved successfully:', savedGroup);

      // Refresh the list of groups for the current library context
      await fetchQueryGroups(selectedLibraryId.value); // Pass current library ID

      // Update the selected group state if the saved group matches the current selection context
      selectedQueryGroup.value = savedGroup;

      // If a new group was created (POST), set the flag
      if (method === 'POST') {
        isNewlyCreatedGroupSelected.value = true;
        console.log('Newly created group flag set.');
      } else {
        // Ensure flag is false if it was an update
        isNewlyCreatedGroupSelected.value = false;
      }

      // TODO: Reset modified state if applicable
      // if (isGroupModified) isGroupModified.value = false;

      return savedGroup; // Return the saved group data

    } catch (err) {
      console.error('Error saving query group:', err);
      error.value = err instanceof Error ? err : new Error('An unknown error occurred');
      throw error.value; // Re-throw error for component handling
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Deletes a query group by its ID.
   */
  const deleteQueryGroup = async () => {
    if (!selectedQueryGroup.value || isLoading.value) {
      console.warn('Delete condition not met (no group selected or already loading).');
      return;
    }

    const groupToDelete = selectedQueryGroup.value;
    const groupId = groupToDelete['@id'];

    if (!window.confirm(`Are you sure you want to delete the query group "${groupToDelete.name}"? This cannot be undone.`)) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const deleteUrl = `${apiUrl.value}/api/queryGroups/${encodeURIComponent(groupId)}`;
      console.log(`Attempting to delete query group: ${groupId} via ${deleteUrl}`);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
         // Handle 404 specifically?
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      console.log('Query group deleted successfully.');

      // Refresh the list
      await fetchQueryGroups();

      // Reset the selected group and related state using the provided function
      prepareNewGroupState();
      isNewlyCreatedGroupSelected.value = false; // Ensure flag is reset on delete

    } catch (err: any) {
      console.error('Error deleting query group:', err);
      error.value = err instanceof Error ? err : new Error('An unknown error occurred');
      alert(`Delete failed: ${error.value.message || 'Unknown error'}`); // Show error to user
      // Don't re-throw here, let the UI handle the error state
    } finally {
      isLoading.value = false;
    }
  };

  // Watcher to reset the flag if the selected group changes *away* from the newly created one
  // or becomes null. This prevents the flag staying true if the user clicks another group
  // *after* creating one but *before* the editor reacts.
  watch(selectedQueryGroup, (newGroup, oldGroup) => {
    // If the selection changes *away* from a group (to null or another group)
    // or if the component consuming this explicitly sets the flag back to false,
    // ensure the flag is false.
    // We primarily rely on the consuming component to reset the flag *after* acting on it.
    // This watcher is a safety net.
    if (isNewlyCreatedGroupSelected.value && newGroup?.['@id'] !== oldGroup?.['@id']) {
       // console.log('Selected group changed away from newly created one, resetting flag.');
       // isNewlyCreatedGroupSelected.value = false; // Let the consumer reset it primarily
    }
    // If a group is selected that wasn't just created, ensure the flag is false.
    if (newGroup && !isNewlyCreatedGroupSelected.value) {
        // This case is handled by the save/fetch logic setting it to false.
    }
    // If selection becomes null, reset the flag.
    if (!newGroup) {
        isNewlyCreatedGroupSelected.value = false;
    }
  });


  return {
    isLoading,
    error,
    queryGroups, // List of groups (typically for the current library)
    fetchQueryGroups, // Fetch list (potentially filtered)
    fetchQueryGroupById, // Fetch single group
    saveQueryGroup,
    deleteQueryGroup,
    isNewlyCreatedGroupSelected, // Expose the flag
  };
}
