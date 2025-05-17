# Query Group Canvas State Persistence Design

## 1. Objective

To reliably save and restore the visual state of the query group canvas, including:
-   Position of each query node.
-   Label of each query node (if distinct from the assigned query's name).
-   Selection state of nodes and edges (optional, as Vue Flow often handles this reactively).
-   Viewport state: pan (x, y coordinates) and zoom level of the canvas.

This ensures that when a user reloads a query group, the canvas appears exactly as they left it.

## 2. Data Structures (from `types/query.ts`)

The persistence relies on fields within the existing `QueryNode` and `QueryGroup` interfaces:

### `QueryNode`
```typescript
interface QueryNode {
  '@id': string;
  '@type': 'QueryNode';
  queryId: string;
  backendId?: string;
  parameterMappings?: NodeParameterMapping[];
  position?: { x: number; y: number }; // Stores individual node's X and Y coordinates
  label?: string;                       // Stores a custom label for the node on the canvas
  isSelected?: boolean;                 // Optional: can store selection state if needed beyond Vue Flow's internal handling
}
```
-   `position`: This object directly stores the `x` and `y` coordinates of the node on the Vue Flow canvas.
-   `label`: Stores the display label for the node. This can be derived from the assigned query or set customly.
-   `isSelected`: While Vue Flow manages selection reactively, this could be used to persist selection if required across sessions explicitly.

### `QueryGroup`
```typescript
interface QueryGroup {
  '@id': string;
  '@type': 'QueryGroup';
  name: string;
  description?: string;
  nodes?: QueryNode[];                 // Array of query nodes, each with its state
  edges?: QueryEdge[];
  startNodeIds?: string[];
  endNodeIds?: string[];
  canvasLayout?: string; // JSON string storing the viewport state { x, y, zoom }
  // ... other properties
}
```
-   `nodes`: The array of `QueryNode` objects. Each node within this array will have its `position`, `label`, etc., saved.
-   `canvasLayout`: A JSON string that stores the viewport state object from Vue Flow (e.g., `{ "x": 100, "y": 50, "zoom": 0.8 }`).

## 3. Component Responsibilities

### `QueryGroupCanvas.vue` (The Canvas Component)

-   **Loading Node Positions**: `[COMPLETED]`
    -   Receives `groupData: QueryGroup | null` as a prop.
    -   In the `watch`er for `props.groupData`:
        -   When mapping `ApiQueryNode` (from `groupData.nodes`) to Vue Flow `Node` objects, it uses `apiNode.position` to set the `position` of the Vue Flow node.
        -   If `apiNode.position` is undefined (e.g., for older data or newly created nodes before a save), it provides a random fallback position.
-   **Loading Viewport State**: `[COMPLETED]`
    -   In the `watch`er for `props.groupData`:
        -   If `newGroupData.canvasLayout` exists and is a valid JSON string representing a viewport (`{x, y, zoom}`), it parses this string.
        -   It then calls `setViewport()` (from `useVueFlow()`) with the parsed viewport object, wrapped in `nextTick()` to ensure nodes are rendered.
        -   If `newGroupData.canvasLayout` is missing or invalid, it calls `fitView()` (from `useVueFlow()`) as a fallback, also in `nextTick()`.
        -   The `fit-view-on-init` prop on `<VueFlow>` is removed to allow this explicit control.
-   **Exposing Canvas State for Saving**: `[COMPLETED]`
    -   Exposes a method `getCanvasLayoutString(): string`. This method returns `JSON.stringify(viewport.value)`.
    -   Exposes methods `getNodes(): Node[]` and `getEdges(): Edge[]` to return the current Vue Flow nodes and edges.
-   **Detecting Changes for `update:modified` Event**: `[COMPLETED]`
    -   `onNodesChange`: Emits `update:modified` if a node's `position` (drag completion) or `selected` state changes.
    -   `onEdgesChange`: Emits `update:modified` if an edge is removed or its `selected` state changes.
    -   `onConnect`: Emits `update:modified` when a new edge is created.
    -   `watch(viewport, ...)`: A new watcher on the `viewport` ref (from `useVueFlow()`). If `viewport.x`, `viewport.y`, or `viewport.zoom` changes, it emits `update:modified`. This captures pan and zoom actions.

### Parent Component (e.g., `QueryGroupView.vue` or `useQueryGroupPersistence.ts`)

-   **Saving Node and Edge State**: `[COMPLETED]`
    -   When preparing the `QueryGroupSaveData` object for saving (in `QueryGroupView.vue`):
        -   It calls `canvasRef.value.getNodes()` and `canvasRef.value.getEdges()` to get the current Vue Flow nodes and edges.
        -   For each Vue Flow node, it transforms it into an `ApiQueryNode`, updating `position` and `label`. Other properties like `parameterMappings` and `backendId` are preserved from the original node data if the node existed previously.
        -   For each Vue Flow edge, it transforms it into an `ApiQueryEdge`, updating `label`. The `mappings` property is preserved from the original edge data if it existed, or defaults to an empty array for new edges.
        -   The transformed `ApiQueryNode[]` and `ApiQueryEdge[]` are assigned to `QueryGroupSaveData.nodes` and `QueryGroupSaveData.edges`.
-   **Saving Viewport State**: `[COMPLETED]`
    -   It calls the `getCanvasLayoutString()` method exposed by the `QueryGroupCanvas.vue` component instance (via `canvasRef.value`).
    -   The returned JSON string is assigned to `QueryGroupSaveData.canvasLayout`.
-   **Backend Interaction**: `[COMPLETED]` (Handled by `useQueryGroupPersistence.ts`)
    -   Sends the fully populated `QueryGroupSaveData` object (including updated node positions, edge details, and the `canvasLayout` string) to the backend API for persistence.

## 4. Workflow

### Loading a Query Group `[COMPLETED]`

1.  Parent component (e.g., `QueryGroupView`) fetches `QueryGroup` data from the backend.
2.  This `QueryGroup` data (containing `nodes` with their `position` and `canvasLayout` string) is passed as the `groupData` prop to `QueryGroupCanvas.vue`.
3.  `QueryGroupCanvas.vue`:
    a.  Maps `groupData.nodes` to its internal Vue Flow `nodes` ref, using `apiNode.position` for each node.
    b.  Parses `groupData.canvasLayout` and calls `setViewport()` or `fitView()` accordingly.

### User Interaction & Modifying State `[COMPLETED]`

1.  User drags a node:
    -   Vue Flow updates the node's position internally (reactive via `v-model:nodes`).
    -   `onNodesChange` in `QueryGroupCanvas.vue` detects the `position` change on drag end and emits `update:modified`.
2.  User pans or zooms the canvas:
    -   Vue Flow updates `viewport.value` (from `useVueFlow()`).
    -   The `watch` on `viewport` in `QueryGroupCanvas.vue` detects the change and emits `update:modified`.
3.  User adds/removes nodes/edges, assigns queries, edits labels:
    -   Existing handlers in `QueryGroupCanvas.vue` emit `update:modified`.

### Saving a Query Group `[COMPLETED]`

1.  User initiates a save action (e.g., clicks "Save" button in `QueryGroupView`).
2.  The parent component (`QueryGroupView.vue`):
    a.  Prepares the `QueryGroupSaveData` object.
    b.  Calls `canvasRef.value.getNodes()` and `canvasRef.value.getEdges()` to get current Vue Flow elements.
    c.  Transforms these elements into `ApiQueryNode` and `ApiQueryEdge` format, including their `position`, `label`, and preserving other relevant properties like `mappings`.
    d.  Calls `canvasRef.value.getCanvasLayoutString()` to get the current viewport JSON.
    e.  Assigns all collected data (name, description, transformed nodes/edges, layout string) to `QueryGroupSaveData`.
    f.  Calls `persistSaveGroup` (from `useQueryGroupPersistence.ts`) with the `QueryGroupSaveData`.

## 5. Key Vue Flow Features Utilized

-   `v-model:nodes="nodes"` and `v-model:edges="edges"`: For two-way binding of nodes and edges state.
-   `useVueFlow()`: To get access to:
    -   `viewport`: A reactive ref holding the current viewport state (`{ x, y, zoom }`).
    -   `setViewport(viewportObject)`: Function to programmatically set the viewport.
    -   `fitView()`: Function to adjust the viewport to fit all nodes.
    -   `onNodesChange`, `onEdgesChange`, `onConnect`: Event handlers for graph interactions.
-   Custom Node Components (`<template #node-queryNode>...`): To render nodes with specific data and behavior.

## 6. Future Considerations

-   **Debouncing `update:modified`**: For frequent events like viewport changes during drag-panning, the `update:modified` emission could be debounced if it causes performance issues or too frequent "unsaved changes" indicators.
-   **Granular State in `canvasLayout`**: If more than just viewport (e.g., background settings, grid settings specific to Vue Flow) needs to be saved, the object serialized into `canvasLayout` can be expanded.
-   **Error Handling**: Robust error handling for `JSON.parse` when loading `canvasLayout`. The current fallback to `fitView()` is a good default.

This design ensures that all relevant visual aspects of the query group canvas are persisted and restored, providing a consistent user experience.
