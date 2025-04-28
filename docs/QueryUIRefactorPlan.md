# Query UI Refactor Plan (Revised)

This document outlines the planned modifications to the query management page (`pages/queries.vue`) based on a review of the existing code. The goal is to refine the query management actions (New, Save, Delete, Copy ID).

## 1. Context

The existing `pages/queries.vue` component already implements a two-column layout with a query list on the left and an editor/details pane on the right. It includes functionality for selecting, viewing, editing (with distinct view/edit modes for details), saving (create/update), and discarding changes.

## 2. Planned Changes

The following modifications will be made to `pages/queries.vue`:

### 2.1. Relocate and Modify "New Query" Button

*   **Current Location:** Left panel, above the query list.
*   **New Location:** Right panel (editor/details pane), positioned near the "Save Query" button.
*   **Behavior:**
    *   Clicking the "➕ Create New Query" button will directly call the existing `prepareNewQueryState()` function. This function handles:
        *   Resetting the main editor pane (SPARQL code, results, analysis).
        *   Clearing the Name, Description, and ID fields in the details section.
        *   Setting `isEditingDetails = true`, immediately putting the details section into edit mode.
    *   The previous logic for inline name input in the left panel will be removed.
    *   **(Enhancement):** After `prepareNewQueryState()` is called, `nextTick` will be used to attempt focusing the main Name input field (`#queryName`) in the right panel's details section.

### 2.2. Add "Copy ID" Button

*   **Location:** In the template's "View Mode" for query details (within the `v-else` block associated with `isEditingDetails`).
*   **Implementation:**
    *   A small icon button (representing "copy") will be added next to the displayed query ID (`<code class="text-xs bg-gray-100 px-1 rounded">{{ selectedQuery['@id'] }}</code>`).
    *   A new method, `copyQueryId()`, will be created. This method will use `navigator.clipboard.writeText()` to copy the `selectedQuery.value['@id']` to the clipboard.
    *   User feedback (e.g., a temporary tooltip or message like "Copied!") will be implemented to confirm the copy action.
    *   The `copyQueryId` method will be attached to the `@click` event of the new button.
    *   The button will be conditionally rendered using `v-if="selectedQuery?.['@id']"` to ensure it only appears when a query with an ID is selected and displayed.

### 2.3. Add "Delete Query" Button

*   **Location:** Right panel (editor/details pane), positioned near the "Save Query" and "Create New Query" buttons.
*   **Implementation:**
    *   A "Delete Query" button will be added.
    *   A new method, `deleteQuery()`, will be created.
    *   This method will first prompt the user for confirmation (e.g., using `window.confirm` or a modal dialog).
    *   If confirmed, it will call the appropriate API endpoint (likely via `useLibrariesApi`) to delete the currently `selectedQuery`.
    *   Upon successful deletion, the UI should be updated (e.g., remove the query from the list, potentially select the next query or clear the editor pane).
    *   Error handling will be included for the API call.
    *   The button will be conditionally rendered, likely enabled only when a query is selected (`v-if="selectedQuery"`).

## 3. Rationale

This approach centralizes query actions (New, Save, Delete, Copy ID) within the main editor/details pane, leverages existing state management, and introduces necessary delete functionality, improving the overall user workflow.
