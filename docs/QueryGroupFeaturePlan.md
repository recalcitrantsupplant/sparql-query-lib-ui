# Query Group Feature Implementation Plan

## Core Idea

Introduce a view mode toggle within `pages/queries.vue` to switch between the existing "Query Editor" interface and a new "Query Group Canvas" interface. Both views will share the `LibrariesPanel`.

## Implementation Steps

1.  **Introduce View Mode State & Toggle in `pages/queries.vue`:**
    *   Add a `ref` to manage the current view:
        ```typescript
        const viewMode = ref<'query' | 'group'>('query'); // Default to query view
        ```
    *   Add UI elements (e.g., `shadcn-vue` Tabs component) to toggle `viewMode`. Place strategically (e.g., top of the right panel).
        *   Conceptual Example:
            ```vue
            <Tabs default-value="query" @update:modelValue="viewMode = $event">
              <TabsList>
                <TabsTrigger value="query">Query Editor</TabsTrigger>
                <TabsTrigger value="group">Query Group Canvas</TabsTrigger>
              </TabsList>
            </Tabs>
            ```

2.  **Refactor Content Areas in `pages/queries.vue`:**
    *   **Right Panel:** Wrap the entire existing content (header, details, editor, results, analysis sidebar) within a `div` controlled by `v-if="viewMode === 'query'"`.
    *   **Left Panel:**
        *   Keep `LibrariesPanel` always visible.
        *   Conditionally render `QueryList` or a new `QueryGroupList` component based on `viewMode`:
            ```vue
            <QueryList v-if="viewMode === 'query'" ... />
            <QueryGroupList v-else-if="viewMode === 'group'" ... />
            ```

3.  **Create New Query Group Components:**
    *   `components/QueryGroupList.vue`: Fetches/displays query groups for the selected library, handles selection.
    *   `components/QueryGroupDetailsEditor.vue`: Edits name, description, ID (if applicable) for the selected query group.
    *   `components/QueryGroupCanvas.vue`: Renders the visual canvas for building query groups (requires integrating a diagramming/flow library like Vue Flow).
    *   `components/QueryGroupActionButtons.vue`: Provides buttons for "New Group", "Save Group", "Delete Group", etc.

4.  **Structure the Query Group View (Right Panel in `pages/queries.vue`):**
    *   Inside a new block `v-else-if="viewMode === 'group'"`:
        *   Add a header (e.g., `<h2>Query Group Canvas</h2>`).
        *   Include `QueryGroupActionButtons`.
        *   Include `QueryGroupDetailsEditor`.
        *   Include the main `QueryGroupCanvas` component.
        *   *(Note: `QueryAnalysisSidebar` and `QueryResultDisplay` are likely not needed here).*

5.  **Develop State Management for Query Groups:**
    *   Create `composables/useQueryGroupPersistence.ts`: Handles API interactions (fetch, save, delete) for query groups.
    *   Define necessary types in `types/query.ts` (or a new `types/queryGroup.ts`) for query group data structures.
    *   Adapt `composables/useSettings.ts` if needed (e.g., to track `selectedQueryGroupId`).

6.  **API Integration:**
    *   Ensure backend API endpoints exist (or plan for their creation) for CRUD operations on query groups, associated with libraries.

## Summary of Changes in `pages/queries.vue`

*   Add `viewMode` ref.
*   Add Tabs component for switching `viewMode`.
*   Conditionally render `QueryList` / `QueryGroupList` in the left panel.
*   Conditionally render the entire existing right panel content (`v-if="viewMode === 'query'"`).
*   Add a new block (`v-else-if="viewMode === 'group'"`) containing the new Query Group components (`QueryGroupActionButtons`, `QueryGroupDetailsEditor`, `QueryGroupCanvas`).
*   Import and use new components and composables related to query groups.

---

## Progress

*   [x] **Step 1: Introduce View Mode State & Toggle in `pages/queries.vue`**
*   [x] **Step 2: Refactor Content Areas in `pages/queries.vue`**
*   [x] **Step 3: Create New Query Group Components**
*   [x] **Step 4: Structure the Query Group View (Right Panel in `pages/queries.vue`)**
*   [x] **Step 5: Develop State Management for Query Groups**
*   [x] **Step 6: API Integration**
