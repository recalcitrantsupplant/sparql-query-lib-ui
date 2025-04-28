# Query Parameter Handling Design (`pages/queries.vue`)

This document outlines the planned implementation for handling SPARQL query parameters, including the UI toggle and display logic within the `pages/queries.vue` component.

## Core Requirements

1.  **Parameter Mode Toggle:** Introduce a UI control (e.g., toggle button) allowing users to switch between 'Detect' and 'Specify' modes for parameter handling.
2.  **Mode Logic:**
    *   **New Queries:** Default to 'Detect' mode until the query is saved for the first time.
    *   **Existing/Saved Queries:** Default to 'Specify' mode upon loading or after saving (PUT request). This applies even if the query currently has no parameters defined.
3.  **Parameter Data Source:** Parameters are sourced from the `parameters` array within the query objects returned by:
    *   The initial GET request fetching all queries.
    *   The PUT request response when a query is updated.
4.  **Parameter Display:** When in 'Specify' mode:
    *   Display a dedicated section showing the defined parameters.
    *   If no parameters are defined for the current query, display a message indicating this (e.g., "No parameters specified for this query.").
    *   If parameters exist, group them according to the `QueryParameterGroup` structure in the data.
    *   Render each `QueryParameterGroup` in a visually distinct block (e.g., light background).
    *   Within each group, list each `QueryParameter` (`vars` array item) on a new row/div.
    *   Display the `paramName` on the left.
    *   Display the `allowedTypes` on the right.
5.  **Allowed Types Styling:** Each type listed in a parameter's `allowedTypes` array should be highlighted (e.g., using a green background badge).

## Implementation Plan

1.  **State Management (`pages/queries.vue`):**
    *   Introduce `parameterMode = ref('Detect')` to track the current mode.
    *   Introduce `currentParameters = ref([])` to hold the parameter data for the selected query when in 'Specify' mode.
2.  **UI Components:**
    *   Add button(s) or a toggle component to switch `parameterMode` between `'Detect'` and `'Specify'`.
    *   Create a conditional rendering block (`v-if="parameterMode === 'Specify'"`) for the parameter display area.
3.  **Logic (`pages/queries.vue`):**
    *   Use a `watch` on the `selectedQuery` ref.
    *   When `selectedQuery` changes:
        *   If it's a new query (no ID), set `parameterMode = 'Detect'`, `currentParameters = []`.
        *   If it's an existing query (has ID), set `parameterMode = 'Specify'`, `currentParameters = selectedQuery.value.parameters || []`.
    *   Update the `handleSaveChanges` (or equivalent PUT request handler):
        *   After a successful save, set `parameterMode = 'Specify'`.
        *   Update `currentParameters` based on the `parameters` array in the PUT response (`response.data.parameters || []`).
4.  **Template (`pages/queries.vue`):**
    *   Implement the parameter display section using `v-for` to iterate through `currentParameters` (groups) and `group.vars` (parameters).
    *   Style the groups and rows as required.
    *   Implement the green highlighting for each item in the `allowedTypes` array.
    *   Include the "No parameters specified" message logic.
5.  **API Integration (`composables/useLibrariesApi.ts`):**
    *   Verify that the functions handling GET `/queries` and PUT `/queries/{id}` correctly parse and return the `parameters` array within the query objects. Make adjustments if necessary.

## Next Steps

1.  Read the current code in `pages/queries.vue` and `composables/useLibrariesApi.ts`.
2.  Implement the changes outlined above in ACT mode.
