import { ref, type Ref, computed } from 'vue';
import type { Query, QueryParameterGroup } from '@/types/query';
import type QueryAnalysisSidebar from '@/components/QueryAnalysisSidebar.vue';
// Removed QueryDetailsEditor import as the ref is no longer passed
import type QueryList from '@/components/QueryList.vue';

export function useQueryPersistence(
  apiUrl: Ref<string>,
  selectedLibraryId: Ref<string | null>,
  selectedQuery: Ref<Query | null>,
  // Accept individual refs for details instead of the component ref
  editedName: Ref<string>,
  editedDescription: Ref<string | undefined>,
  editedId: Ref<string>,
  code: Ref<string>,
  isSaving: Ref<boolean>,
  analysisSidebarRef: Ref<InstanceType<typeof QueryAnalysisSidebar> | null>,
  // queryDetailsEditorRef removed
  queryListRef: Ref<InstanceType<typeof QueryList> | null>,
  isQueryModified: Ref<boolean>,
  prepareNewQueryState: () => void // Pass the function to reset state after delete/save new
) {

  const saveQuery = async () => {
    const hasParseError = analysisSidebarRef.value?.hasParseError ?? false;
    // Use the passed-in refs directly
    // Validation (like required name, valid URI) should ideally happen *before* calling this function,
    // e.g., in the component's save button logic. We'll keep basic checks here for safety.

    if (!editedName.value.trim()) {
      alert('Query Name is required to save.');
      console.warn('Save aborted: Query Name is required.');
      return; // Name is essential
    }

    // Check if there are actual modifications before proceeding
    if (!isQueryModified.value) {
        console.warn('Save aborted: No modifications detected.');
        // Optionally provide user feedback, e.g., using toast
        // toast.info('No changes to save.');
        return;
    }

    // Basic safety checks - more complex validation (like URI format) is assumed done by caller
    if (!selectedLibraryId.value || hasParseError || isSaving.value) {
      console.warn('Save condition not met (library selected?, parse error?, already saving?).');
      if (!selectedLibraryId.value) alert('Please select a library before saving.');
      if (hasParseError) alert('Cannot save query with SPARQL syntax errors.');
      return;
    }
    // Removed URI validation here - should be done before calling saveQuery
    // Removed isQueryModified check here - assume caller checks this


    isSaving.value = true;

    const queryData: {
      name: string;
      description?: string; // Make description optional in payload
      query: string;
      libraryId: string;
      id?: string;
      parameters?: QueryParameterGroup[] | null;
    } = {
      name: editedName.value.trim(), // Use ref value
      description: editedDescription.value?.trim() || undefined, // Use ref value, ensure undefined if empty
      query: code.value,
      libraryId: selectedLibraryId.value,
    };

    // Add description to payload only if it has a value
    if (editedDescription.value?.trim()) {
        queryData.description = editedDescription.value.trim();
    } else {
        delete queryData.description; // Ensure it's not sent if empty/undefined
    }

    // Handle parameters
    if (analysisSidebarRef.value?.parameterMode === 'Specify' && analysisSidebarRef.value?.currentParameters) {
      queryData.parameters = analysisSidebarRef.value.currentParameters;
    } else {
      queryData.parameters = null; // Explicitly set to null if not specified
    }

    // Handle optional ID for new queries (assuming URI validation happened before calling)
    if (!selectedQuery.value && editedId.value.trim()) {
      queryData.id = editedId.value.trim();
      console.log(`Including provided ID in create payload: ${queryData.id}`);
    }

    try {
      let response: Response;
      let url: string;
      let method: string;

      if (selectedQuery.value) {
        url = `${apiUrl.value}/api/queries/${encodeURIComponent(selectedQuery.value['@id'])}`;
        method = 'PUT';
        console.log(`Updating query: ${url}`);
      } else {
        url = `${apiUrl.value}/api/queries`;
        method = 'POST';
        console.log(`Creating new query: ${url}`);
      }

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(queryData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const savedQuery = await response.json() as Query;
      console.log('Query saved successfully:', savedQuery);

      if (queryListRef.value && selectedLibraryId.value) {
        await queryListRef.value.fetchQueries(selectedLibraryId.value);
      }

      // Update the selected query and initial code after saving
      selectedQuery.value = savedQuery;
      code.value = savedQuery.query;
      // initialCode.value = savedQuery.query; // This should be handled by the watcher on selectedQuery

      // Update parameter state in the analysis sidebar after saving
      if (analysisSidebarRef.value) {
        if (savedQuery.parameters && savedQuery.parameters.length > 0) {
          // If parameters were saved, set mode to Specify and update parameters
          analysisSidebarRef.value.parameterMode = 'Specify';
          analysisSidebarRef.value.currentParameters = savedQuery.parameters;
          console.log('Post-save: Set parameter mode to Specify with saved parameters.');
        } else {
          // If no parameters were saved (or empty array), revert to Detect mode
          // This allows the analysis sidebar to re-detect parameters based on the saved code
          analysisSidebarRef.value.parameterMode = 'Detect';
          analysisSidebarRef.value.currentParameters = null; // Clear any potentially stale specified params
          console.log('Post-save: No parameters saved, reverting parameter mode to Detect.');
          // Optionally trigger analysis if needed, though code change might handle it
          // analysisSidebarRef.value.triggerAnalysis(code.value);
        }
      }

    } catch (err: any) {
      console.error('Error saving query:', err);
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      isSaving.value = false;
    }
  };

  const deleteQuery = async () => {
    if (!selectedQuery.value || isSaving.value) {
      console.warn('Delete condition not met.');
      return;
    }

    const queryToDelete = selectedQuery.value;

    if (!window.confirm(`Are you sure you want to delete the query "${queryToDelete.name}"? This cannot be undone.`)) {
      return;
    }

    isSaving.value = true;

    try {
      const queryIdToDelete = queryToDelete['@id'];
      const deleteUrl = `${apiUrl.value}/api/queries/${encodeURIComponent(queryIdToDelete)}`;
      console.log(`Attempting to delete query: ${queryIdToDelete} via ${deleteUrl}`);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      console.log('Query deleted successfully.');

      if (queryListRef.value && selectedLibraryId.value) {
        await queryListRef.value.fetchQueries(selectedLibraryId.value);
      }

      prepareNewQueryState(); // Reset state after deletion

    } catch (err: any) {
      console.error('Error deleting query:', err);
      alert(`Delete failed: ${err.message || 'Unknown error'}`);
    } finally {
      isSaving.value = false;
    }
  };

  return {
    saveQuery,
    deleteQuery,
  };
}
