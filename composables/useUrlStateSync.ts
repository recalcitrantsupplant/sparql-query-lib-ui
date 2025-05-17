import { ref, watch, onMounted, nextTick, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettings } from '@/composables/useSettings';
import type { Query, QueryGroup, QueryArgumentsModel } from '@/types/query'; // Import QueryArgumentsModel

// Define the types for the parameters the composable accepts
interface UseUrlStateSyncOptions {
  selectedQuery: Ref<Query | null>;
  selectedQueryGroup: Ref<QueryGroup | null>; // Add selected query group ref
  viewMode: Ref<'query' | 'group'>;
  queryArguments: Ref<QueryArgumentsModel>; // Use QueryArgumentsModel
}

export function useUrlStateSync({ selectedQuery, selectedQueryGroup, viewMode, queryArguments }: UseUrlStateSyncOptions) {
  const route = useRoute();
  const router = useRouter();
  const { selectedLibraryId } = useSettings(); // Get selectedLibraryId from settings

  // Refs to store initial values found in the URL on load
  const initialLibraryIdFromUrl = ref<string | null>(null);
  const initialQueryIdFromUrl = ref<string | null>(null);
  const initialGroupIdFromUrl = ref<string | null>(null); // Add ref for initial group ID
  const initialArgumentsFromUrl = ref<QueryArgumentsModel | null>(null); // Use QueryArgumentsModel
  const isInitialLoadComplete = ref(false); // Flag to prevent updates during initial load

  // --- Session Storage Logic ---
  const getSessionStorageKey = (libraryId: string | null, queryId: string | null): string | null => {
    if (!libraryId || !queryId) return null;
    // Use a prefix and encode components to avoid issues with special characters
    return `sparqlUi:queryArgs:${encodeURIComponent(libraryId)}:${encodeURIComponent(queryId)}`;
  };

  const saveArgsToSession = (libraryId: string | null, queryId: string | null, args: Record<string, any> | null) => {
    const key = getSessionStorageKey(libraryId, queryId);
    if (!key) return;

    if (args && (Object.keys(args.values).length > 0 || Object.keys(args.limit).length > 0 || Object.keys(args.offset).length > 0)) {
      try {
        sessionStorage.setItem(key, JSON.stringify(args));
        console.log(`useUrlStateSync: Saved args to sessionStorage for key: ${key}`);
      } catch (error) {
        console.error("useUrlStateSync: Failed to save args to sessionStorage:", error);
      }
    } else {
      sessionStorage.removeItem(key);
      console.log(`useUrlStateSync: Removed args from sessionStorage for key: ${key}`);
    }
  };

  const loadArgsFromSession = (libraryId: string | null, queryId: string | null): QueryArgumentsModel | null => {
    const key = getSessionStorageKey(libraryId, queryId);
    if (!key) return null;

    const storedArgs = sessionStorage.getItem(key);
    if (storedArgs) {
      try {
        const parsedArgs = JSON.parse(storedArgs);
        console.log(`useUrlStateSync: Loaded args from sessionStorage for key: ${key}`, parsedArgs);
        return parsedArgs;
      } catch (error) {
        console.error("useUrlStateSync: Failed to parse args from sessionStorage:", error);
        sessionStorage.removeItem(key); // Remove invalid data
        return null;
      }
    }
    return null;
  };
  // --- End Session Storage Logic ---


  // Function to update the URL query parameters AND session storage
  const updateState = () => {
    // Prevent URL updates until the initial mount and state setting is done
    if (!isInitialLoadComplete.value) {
      console.log("useUrlStateSync: Skipping updateState during initial load phase.");
      return;
    }

    const isQueryView = viewMode.value === 'query';
    const isGroupView = viewMode.value === 'group';
    const currentLibraryId = selectedLibraryId.value;
    const currentQueryId = isQueryView ? selectedQuery.value?.['@id'] : undefined;
    const currentGroupId = isGroupView ? selectedQueryGroup.value?.['@id'] : undefined; // Get current group ID
    const currentArgs = queryArguments.value; // This is QueryArgumentsModel
    let serializedUrlArgs: string | undefined = undefined;
    let shouldUpdateUrl = false;

    // --- URL Args Serialization ---
    if (isQueryView && currentQueryId && currentArgs && (Object.keys(currentArgs.values).length > 0 || Object.keys(currentArgs.limit).length > 0 || Object.keys(currentArgs.offset).length > 0)) {
      try {
        serializedUrlArgs = btoa(JSON.stringify(currentArgs));
      } catch (error) {
        console.error("useUrlStateSync: Failed to serialize arguments for URL:", error);
        serializedUrlArgs = undefined;
      }
    }

    // --- Session Storage Update ---
    // Save/remove args from session storage whenever they change for the current query/library
    if (isQueryView && currentQueryId) {
        saveArgsToSession(currentLibraryId, currentQueryId, currentArgs);
    }

    // --- URL Update Logic ---
    const urlQueryId = route.query.queryId;
    const urlGroupId = route.query.groupId; // Get group ID from URL
    const urlLibraryId = route.query.libraryId;
    const urlArgs = route.query.args;

    // Check if URL needs update based on library, query/group ID, and args
    if (
      currentLibraryId !== urlLibraryId ||
      (isQueryView && currentQueryId !== urlQueryId) || // Only check queryId in query view
      (isGroupView && currentGroupId !== urlGroupId) || // Only check groupId in group view
      (isQueryView && serializedUrlArgs !== urlArgs) || // Only check args in query view
      (!isQueryView && urlArgs !== undefined) || // Ensure args are removed if not in query view
      (!isGroupView && urlGroupId !== undefined) // Ensure groupId is removed if not in group view
    ) {
      shouldUpdateUrl = true;
      console.log(`useUrlStateSync: Updating URL params. View: ${viewMode.value}, Lib: ${currentLibraryId}, Query: ${currentQueryId}, Group: ${currentGroupId}, Args: ${serializedUrlArgs ? 'present' : 'absent'}`);
      const queryParams: Record<string, string | undefined> = {};
      queryParams.libraryId = currentLibraryId ?? undefined;
      // Conditionally add queryId or groupId based on viewMode
      if (isQueryView) {
        queryParams.queryId = currentQueryId ?? undefined;
        queryParams.args = serializedUrlArgs ?? undefined;
        queryParams.groupId = undefined; // Ensure groupId is removed
      } else if (isGroupView) {
        queryParams.groupId = currentGroupId ?? undefined;
        queryParams.queryId = undefined; // Ensure queryId is removed
        queryParams.args = undefined; // Ensure args are removed
      } else {
        // Fallback: clear both if viewMode is unexpected (shouldn't happen)
        queryParams.queryId = undefined;
        queryParams.groupId = undefined;
        queryParams.args = undefined;
      }

      Object.keys(queryParams).forEach(key => queryParams[key] === undefined && delete queryParams[key]);

      router.replace({ query: queryParams as Record<string, string> });
    } else {
        console.log("useUrlStateSync: No URL update needed.");
    }
  };

  // Combined watcher for URL state synchronization AFTER initial load
  watch(
    [
      selectedLibraryId,
      () => selectedQuery.value?.['@id'],
      () => selectedQueryGroup.value?.['@id'], // Watch group ID
      queryArguments,
      viewMode
    ],
    (
      [newLibId, newQueryId, newGroupId, newArgs, newViewMode],
      [oldLibId, oldQueryId, oldGroupId, oldArgs, oldViewMode]
    ) => {
      // Only run the update logic AFTER the initial load is complete
      if (isInitialLoadComplete.value) {
        console.log("useUrlStateSync: State changed after initial load, calling updateState.");
        updateState();
      } else {
        console.log("useUrlStateSync: State changed during initial load, skipping updateState call from main watcher.");
      }
    },
    { deep: true } // Deep watch needed for queryArguments object changes
  );

  // Watch specifically for query/library changes to potentially load persisted args (e.g., from session storage)
  // This should run AFTER initial load as well, to handle user navigation between queries.
  watch(
    [selectedLibraryId, () => selectedQuery.value?.['@id']],
    async ([newLibId, newQueryId], [oldLibId, oldQueryId]) => {
        // Only run after initial load and if query/library actually changed
        if (isInitialLoadComplete.value && (newLibId !== oldLibId || newQueryId !== oldQueryId) && viewMode.value === 'query') {
            console.log(`useUrlStateSync: Query/Library changed AFTER initial load. Old: ${oldLibId}/${oldQueryId}, New: ${newLibId}/${newQueryId}. Attempting to load new args.`);

            // Check session storage first for the new combination (URL args handled by initial load)
            let loadedArgs = loadArgsFromSession(newLibId, newQueryId);

            // If not in session, check URL (less common for subsequent navigation, but possible)
            if (!loadedArgs) {
                const urlArgs = route.query.args as string | undefined;
                // Check against the *current* route query, not potentially stale watcher variables
                if (urlArgs && route.query.queryId === newQueryId && route.query.libraryId === newLibId) {
                    try {
                        loadedArgs = JSON.parse(atob(urlArgs));
                        console.log("useUrlStateSync: Loaded args from URL for subsequent query/library change:", loadedArgs);
                    } catch (error) {
                        console.error("useUrlStateSync: Failed to deserialize args from URL during subsequent query change:", error);
                    }
                }
            }

            // Update the main arguments ref if different from current
            // Compare stringified versions to handle object reference differences
            const currentArgsString = JSON.stringify(queryArguments.value);
            const loadedArgsString = JSON.stringify(loadedArgs ?? { values: {}, limit: {}, offset: {} });
            if (currentArgsString !== loadedArgsString) {
                console.log("useUrlStateSync: Updating queryArguments ref with loaded args:", loadedArgs ?? { values: {}, limit: {}, offset: {} });
                queryArguments.value = loadedArgs ?? { values: {}, limit: {}, offset: {} };
                // No need to call updateState() here, the main watcher will pick up the change to queryArguments.value
            } else {
                 console.log("useUrlStateSync: Loaded args are the same as current args, no update needed.");
            }
        }
    },
    { immediate: false } // Don't run immediately
  );


  // Add a ref to store the initial library ID found in the URL
  // const initialLibraryIdFromUrl = ref<string | null>(null); // Already declared above

  // Initial setup on mount - ONLY READS initial state, DOES NOT MODIFY shared state or URL.
  onMounted(() => { // Make synchronous
    console.log("useUrlStateSync: --- Mounted (Reading Initial State) ---");
    const currentRouteQuery = JSON.parse(JSON.stringify(route.query)); // Deep copy for logging
    console.log("useUrlStateSync: Initial route query:", currentRouteQuery);

    // 1. Store initial library ID from URL (if present)
    initialLibraryIdFromUrl.value = currentRouteQuery.libraryId as string ?? null;
    console.log(`useUrlStateSync: Read initial library ID from URL: ${initialLibraryIdFromUrl.value}`);

    // 2. Store initial query ID and group ID from URL (if present)
    initialQueryIdFromUrl.value = currentRouteQuery.queryId as string ?? null;
    initialGroupIdFromUrl.value = currentRouteQuery.groupId as string ?? null; // Read group ID
    console.log(`useUrlStateSync: Read initial query ID from URL: ${initialQueryIdFromUrl.value}`);
    console.log(`useUrlStateSync: Read initial group ID from URL: ${initialGroupIdFromUrl.value}`);

    // 3. Determine initial arguments based on QSA priority (only relevant for query view)
    console.log("useUrlStateSync: --- Determining Initial Arguments (for Query View) ---");
    const urlArgs = currentRouteQuery.args as string | undefined;
    let loadedArgs: QueryArgumentsModel | null = null; // Use QueryArgumentsModel
    let loadedFrom: string = 'none';

    // Use the stored initial IDs for checking conditions and loading from session
    if (urlArgs && initialLibraryIdFromUrl.value && initialQueryIdFromUrl.value) {
      // Priority 1: Args are in the URL QSA (and lib/query IDs are also present)
      console.log("useUrlStateSync: Args found in URL QSA. Attempting to parse...");
      try {
        loadedArgs = JSON.parse(atob(urlArgs));
        loadedFrom = 'URL';
        console.log("useUrlStateSync: Successfully parsed args from URL:", JSON.parse(JSON.stringify(loadedArgs)));
      } catch (error) {
        console.error("useUrlStateSync: Failed to deserialize arguments from URL:", error);
        loadedArgs = null; // Treat as no args if parsing fails
      }
    } else if (!urlArgs && initialLibraryIdFromUrl.value && initialQueryIdFromUrl.value) {
      // Priority 2: Args NOT in QSA, but Lib/Query ARE. Check Session Storage.
      const storageKey = getSessionStorageKey(initialLibraryIdFromUrl.value, initialQueryIdFromUrl.value);
      console.log(`useUrlStateSync: Args not in URL QSA. Checking sessionStorage with key: ${storageKey}`);
      if (storageKey) {
        loadedArgs = loadArgsFromSession(initialLibraryIdFromUrl.value, initialQueryIdFromUrl.value);
        if (loadedArgs) {
          loadedFrom = 'SessionStorage';
          console.log("useUrlStateSync: Successfully loaded args from sessionStorage:", JSON.parse(JSON.stringify(loadedArgs)));
        } else {
          console.log("useUrlStateSync: No args found in sessionStorage for this key.");
        }
      } else {
        console.log("useUrlStateSync: Could not generate sessionStorage key (missing library or query ID).");
      }
    } else {
      // Args cannot be determined from URL or Session Storage based on QSA.
      console.log("useUrlStateSync: Cannot determine initial args - 'args' not in URL QSA, or missing library/query ID in QSA for SessionStorage check.");
    }

    console.log(`useUrlStateSync: Determined initial args: ${loadedArgs ? JSON.stringify(loadedArgs) : 'null'} (Source: ${loadedFrom})`);

    // Store the determined initial arguments. DO NOT update the shared queryArguments ref here.
    initialArgumentsFromUrl.value = loadedArgs;

    // 4. Mount complete. Page component will now use the returned initial values.
    console.log("useUrlStateSync: --- Mount Reading Complete ---");

    // Set the flag AFTER the mount completes using nextTick to ensure parent has likely mounted too
    nextTick(() => {
      console.log("useUrlStateSync: Initial load phase complete. Enabling URL updates via watchers.");
      isInitialLoadComplete.value = true;
      // Trigger an initial state check/update *now* that the flag is set,
      // ensuring the URL reflects the state derived from the initial load.
      updateState();
    });
  });

  // Return the initial values read from the URL
  return {
    initialLibraryIdFromUrl,
    initialQueryIdFromUrl,
    initialGroupIdFromUrl, // Return initial group ID
    initialArgumentsFromUrl,
  };
}
