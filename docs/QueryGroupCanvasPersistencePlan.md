# Plan: Persisting Query Group Canvas Layout

This document outlines the plan to implement the persistence of query group canvas layout data (node positions, zoom, pan, etc.) in the frontend, leveraging the existing backend support for a `canvasLayout` field.

**Backend API Confirmation:**
The `openapi.json` confirms that the backend API (`POST /api/queryGroups/` and `PUT /api/queryGroups/{id}`) already supports a `canvasLayout` field (as a stringified JSON) for creating and updating query groups. No immediate backend changes are anticipated.

## Detailed Step-by-Step Plan

**Phase 1: Frontend Data Model & State Management**

1.  **Inspect Current Canvas State Management:**
    *   Examine `components/QueryGroupCanvas.vue` to understand how the canvas currently manages its state (node positions, zoom, pan, etc.).
    *   Identify where this state is held (e.g., local component state, Pinia store, composable).

2.  **Update Frontend Query Group Type:**
    *   Locate the TypeScript type/interface definition for a Query Group (likely in `types/query.ts`).
    *   Add `canvasLayout?: string` to this type.
    *   Consider adding `parsedCanvasLayout?: YourCanvasStateType` for the deserialized, usable state.

3.  **Composable for Canvas State (Recommended):**
    *   Create or enhance a composable (e.g., `useQueryGroupCanvasState.ts`) to manage:
        *   The reactive canvas state (nodes, edges, viewport).
        *   Serialization of this state to a JSON string.
        *   Deserialization of a JSON string to apply to the canvas.
        *   Interaction with `sessionStorage` for unsaved changes (see Phase 3).

**Phase 2: API Integration & Backend Persistence**

4.  **Enhance `composables/useQueryGroupPersistence.ts` (or equivalent API service):**
    *   **Fetch Operations (`GET /api/queryGroups/{id}` and `GET /api/queryGroups/`):**
        *   Ensure the `canvasLayout` string is retrieved from the backend. This represents the last explicitly saved state.
        *   Store this string in the corresponding frontend query group object.
    *   **Create Operation (`POST /api/queryGroups/`):**
        *   When creating a new query group, the current canvas state (which might be from initial interactions) is serialized.
        *   Include this string in the `canvasLayout` field of the `createQueryGroupBody`.
        *   On successful creation, clear any related `sessionStorage` item for this new query group's ID.
    *   **Update Operation (`PUT /api/queryGroups/{id}`):**
        *   When an explicit save is triggered, the current canvas state (potentially from `sessionStorage` or live edits) is serialized.
        *   Include this string in the `canvasLayout` field of the `updateQueryGroupBody`.
        *   On successful update to the backend, **clear** the `unsavedCanvasLayout_${queryGroupId}` from `sessionStorage`.

**Phase 3: Component Integration, UI Logic & Unsaved Changes Management (Hybrid Approach)**

5.  **`components/QueryGroupCanvas.vue` Modifications & `useQueryGroupCanvasState.ts` Integration:**
    *   **Initialization Logic (Loading Priority):**
        *   On component mount or when the active query group changes (identified by `queryGroupId`):
            1.  **Check `sessionStorage`:** Attempt to load `unsavedCanvasLayout_${queryGroupId}`. If found, deserialize and apply this state to the canvas. This restores the user's most recent unsaved work for the current session.
            2.  **Fallback to Backend Data:** If no `sessionStorage` entry exists, use the `canvasLayout` string from the fetched query group object (the last explicitly saved state). Deserialize and apply it.
            3.  **Default Layout:** If neither `sessionStorage` nor backend `canvasLayout` exists (e.g., brand new query group not yet interacted with), apply default layout logic.
    *   **Handling Canvas Changes (Debounced Auto-Save to `sessionStorage`):**
        *   As the user interacts with the canvas (e.g., node drag end, zoom/pan end), changes to the canvas state should trigger a **debounced** function (e.g., 500ms - 2 seconds delay).
        *   This function serializes the current canvas state and saves it to `sessionStorage` using a key like `unsavedCanvasLayout_${queryGroupId}`.
    *   **Visual Indicator for Unsaved Changes:**
        *   Implement a clear visual cue (e.g., an asterisk `*` next to the query group name, a "Changes unsaved" message, or a modified "Save" button style).
        *   This indicator should be active whenever the current canvas state (live or from `sessionStorage`) differs from the last known state saved to the backend. This can be determined by comparing the live/`sessionStorage` layout with the `canvasLayout` property fetched from the backend.

6.  **`components/QueryGroupView.vue` (or parent component):**
    *   This component will likely manage the "Save Query Group" button or trigger the save action.
    *   When the save action is invoked, it should call the update method in `useQueryGroupPersistence.ts`, which handles sending the current canvas state to the backend and clearing `sessionStorage`.
    *   It should also be responsible for displaying the visual indicator for unsaved changes, possibly based on a reactive flag from `useQueryGroupCanvasState.ts`.

**Phase 4: Data Handling and Edge Cases**

7.  **Serialization/Deserialization Robustness:**
    *   Ensure the serialization process captures all necessary canvas elements (node positions, types, connections if they influence layout, zoom/pan state).
    *   Implement error handling for deserialization (e.g., malformed JSON, future version mismatches). Consider using a try-catch block and falling back to a default layout if errors occur.

8.  **Default Layout for New/Empty Canvas:**
    *   Clearly define the initial layout for a new query group's canvas if no `canvasLayout` is provided.

**Phase 5: Testing**

9.  **Comprehensive Testing Strategy:**
    *   **Create:** Verify that the canvas layout is saved when a new query group is created.
    *   **Load:** Confirm that the canvas layout is correctly restored when an existing query group is loaded.
    *   **Modify & Save:** Test that changes to the layout (dragging nodes, zooming/panning) persist after saving (or auto-saving) and reloading.
    *   **Legacy Data:** Test with query groups that do not yet have a `canvasLayout` (older data). Ensure they load with a default layout without errors.
    *   **Edge Cases:** Test scenarios like an empty canvas, a canvas with a large number of nodes, etc.

**Key Files Potentially Involved:**

*   `components/QueryGroupCanvas.vue`
*   `components/QueryGroupView.vue`
*   `composables/useQueryGroupPersistence.ts`
*   `types/query.ts` (or equivalent type definition file)
*   Potentially a new composable: `composables/useQueryGroupCanvasState.ts`
