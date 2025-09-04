.import { ref, watch, type Ref } from 'vue';
import type { Node, Edge } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { Query, QueryGroup, QueryNode as ApiQueryNode, QueryEdge as ApiQueryEdge, CanvasViewportState } from '@/types/query';

interface FullCanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: CanvasViewportState;
}

export function useQueryGroupCanvasState() {
  const {
    nodes: vueFlowNodes,
    edges: vueFlowEdges,
    viewport: vueFlowViewport,
    setNodes,
    setEdges,
    setViewport,
    addNodes,
    addEdges,
    project,
    fitView,
  } = useVueFlow();

  // --- Serialization ---
  const serializeCanvasState = (): string => {
    const state: FullCanvasState = {
      nodes: vueFlowNodes.value,
      edges: vueFlowEdges.value,
      viewport: vueFlowViewport.value,
    };
    return JSON.stringify(state);
  };

  // --- Deserialization (internal helper) ---
  const deserializeAndApplyCanvasState = (jsonState: string): boolean => {
    try {
      const state = JSON.parse(jsonState) as FullCanvasState;
      // Basic validation of state structure could be added here if needed
      if (state && typeof state.viewport === 'object' && Array.isArray(state.nodes) && Array.isArray(state.edges)) {
        setNodes(state.nodes);
        setEdges(state.edges);
        setViewport(state.viewport);
        return true;
      }
      console.error('Deserialized state is not a valid FullCanvasState:', state);
      return false;
    } catch (error) {
      console.error('Failed to deserialize and apply canvas state:', error);
      fitView(); // Fallback on error
      return false;
    }
  };

  // --- Session Storage Interaction ---
  const saveStateToSessionStorage = (queryGroupId: string) => {
    if (!queryGroupId) return;
    try {
      const currentStateJson = serializeCanvasState();
      sessionStorage.setItem(`unsavedCanvasLayout_${queryGroupId}`, currentStateJson);
      console.log(`Saved canvas state to sessionStorage for ${queryGroupId}`);
    } catch (e) {
      console.error(`Failed to save state to sessionStorage for ${queryGroupId}:`, e);
    }
  };

  const loadStateFromSessionStorage = (queryGroupId: string): boolean => {
    if (!queryGroupId) return false;
    try {
      const savedStateJson = sessionStorage.getItem(`unsavedCanvasLayout_${queryGroupId}`);
      if (savedStateJson) {
        if (deserializeAndApplyCanvasState(savedStateJson)) {
          console.log(`Loaded canvas state from sessionStorage for ${queryGroupId}`);
          return true;
        }
      }
    } catch (e) {
      console.error(`Failed to load state from sessionStorage for ${queryGroupId}:`, e);
    }
    return false;
  };

  const clearStateFromSessionStorage = (queryGroupId: string) => {
    if (!queryGroupId) return;
    try {
      sessionStorage.removeItem(`unsavedCanvasLayout_${queryGroupId}`);
      console.log(`Cleared canvas state from sessionStorage for ${queryGroupId}`);
    } catch (e) {
      console.error(`Failed to clear state from sessionStorage for ${queryGroupId}:`, e);
    }
  };

  // --- Load state from backend QueryGroup data ---
  const loadStateFromBackend = (groupData: QueryGroup | null, queries: Ref<Query[]>) => {
    if (groupData) {
      let stateAppliedFromBackendCanvasLayoutString = false;
      if (groupData.canvasLayout) { // This is the string from backend
        if (deserializeAndApplyCanvasState(groupData.canvasLayout)) {
          stateAppliedFromBackendCanvasLayoutString = true;
          console.log('Applied FULL canvas state from groupData.canvasLayout (backend string)');
        } else {
          // Error already logged by deserializeAndApplyCanvasState
          console.error('Failed to parse/apply groupData.canvasLayout string as FullCanvasState. Will attempt fallback.');
        }
      }

      if (!stateAppliedFromBackendCanvasLayoutString) {
        // Fallback: Map from individual nodes/edges and set viewport from parsedCanvasLayout or fitView
        console.log('Fallback: Applying state from individual nodes/edges and parsed viewport.');
        const mappedNodes: Node[] = (groupData.nodes || []).map((apiNode: ApiQueryNode) => {
          const assignedQuery = queries.value.find(q => q['@id'] === apiNode.queryId) || null;
          return {
            id: apiNode['@id'],
            type: 'queryNode',
            position: apiNode.position || { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
              label: apiNode.label || assignedQuery?.name || apiNode['@id'],
              queryId: apiNode.queryId,
              queryDetails: assignedQuery,
            },
          };
        });
        setNodes(mappedNodes);

        const mappedEdges: Edge[] = (groupData.edges || []).map((apiEdge: ApiQueryEdge) => ({
          id: apiEdge['@id'],
          source: apiEdge.fromNodeId,
          target: apiEdge.toNodeId,
          label: apiEdge.label,
          animated: true,
        }));
        setEdges(mappedEdges);

        if (groupData.parsedCanvasLayout) { // This is the {x,y,zoom} object
          setViewport(groupData.parsedCanvasLayout);
          console.log('Applied viewport from groupData.parsedCanvasLayout.');
        } else {
          fitView();
          console.log('No parsedCanvasLayout, called fitView().');
        }
      }
    } else {
      // Clear canvas if groupData is null
      setNodes([]);
      setEdges([]);
      fitView();
      console.log('Cleared canvas (groupData is null).');
    }
  };

  return {
    // VueFlow reactive state and actions
    nodes: vueFlowNodes,
    edges: vueFlowEdges,
    viewport: vueFlowViewport,
    setNodes,
    setEdges,
    setViewport,
    addNodes,
    addEdges,
    project,
    fitView,

    // Canvas state management functions
    serializeCanvasState,
    saveStateToSessionStorage,
    loadStateFromSessionStorage,
    clearStateFromSessionStorage,
    loadStateFromBackend,
  };
}
