/**
 * DAG (Directed Acyclic Graph) utilities for workflow execution
 */

export interface Node {
  id: string;
  type: string;
  data: any;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ExecutionNode {
  node: Node;
  status: "pending" | "running" | "completed" | "failed";
  dependencies: string[];
  output?: any;
  error?: string;
}

/**
 * Detect cycles in a directed graph using DFS
 * Returns the cycle path if found, null otherwise
 */
export function detectCycles(nodes: Node[], edges: Edge[]): string[] | null {
  const adjacencyList = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Build adjacency list
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }

  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacencyList.set(edge.source, neighbors);
  }

  // DFS helper
  function dfs(nodeId: string, path: string[]): string[] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor, [...path]);
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        return path.slice(cycleStart).concat(neighbor);
      }
    }

    recursionStack.delete(nodeId);
    return null;
  }

  // Check all nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cycle = dfs(node.id, []);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Topological sort using Kahn's algorithm
 * Returns nodes in execution order
 */
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build graph
  for (const edge of edges) {
    adjacencyList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find nodes with no dependencies
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: Node[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find((n) => n.id === nodeId)!;
    sorted.push(node);

    for (const neighbor of adjacencyList.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error("Graph contains a cycle");
  }

  return sorted;
}

/**
 * Build execution graph with dependency tracking
 */
export function buildExecutionGraph(nodes: Node[], edges: Edge[]): Map<string, ExecutionNode> {
  const executionNodes = new Map<string, ExecutionNode>();

  // Initialize execution nodes
  for (const node of nodes) {
    executionNodes.set(node.id, {
      node,
      status: "pending",
      dependencies: [],
    });
  }

  // Set dependencies
  for (const edge of edges) {
    const execNode = executionNodes.get(edge.target);
    if (execNode && !execNode.dependencies.includes(edge.source)) {
      execNode.dependencies.push(edge.source);
    }
  }

  return executionNodes;
}

/**
 * Get nodes that are ready to execute (all dependencies completed)
 */
export function getReadyNodes(executionNodes: Map<string, ExecutionNode>): ExecutionNode[] {
  const ready: ExecutionNode[] = [];

  for (const execNode of executionNodes.values()) {
    if (execNode.status !== "pending") continue;

    // Check if all dependencies are completed OR failed (either way, unblocked)
    const allDepsResolved = execNode.dependencies.every((depId) => {
      const depNode = executionNodes.get(depId);
      return depNode?.status === "completed" || depNode?.status === "failed";
    });

    if (allDepsResolved) {
      ready.push(execNode);
    }
  }

  return ready;
}

/**
 * Collect inputs from dependency nodes
 */
export function collectNodeInputs(
  nodeId: string,
  executionNodes: Map<string, ExecutionNode>,
  edges: Edge[],
  nodeType?: string
): Record<string, any> {
  const inputs: Record<string, any> = {};

  // Get incoming edges
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  // Special handling for LLM nodes - collect images
  if (nodeType === "llm") {
    const images: string[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = executionNodes.get(edge.source);
      if (sourceNode?.status === "completed" && sourceNode.output) {
        const targetHandle = edge.targetHandle || "input";

        if (targetHandle === "image" || targetHandle === "images") {
          // Collect images
          images.push(sourceNode.output);
        } else {
          // Other inputs
          inputs[targetHandle] = sourceNode.output;
        }
      }
    }

    if (images.length > 0) {
      inputs.images = images;
    }
  } else {
    // Standard input collection for other node types
    for (const edge of incomingEdges) {
      const sourceNode = executionNodes.get(edge.source);
      if (sourceNode?.status === "completed" && sourceNode.output !== undefined) {
        const targetHandle = edge.targetHandle || "input";
        inputs[targetHandle] = sourceNode.output;
      }
    }
  }

  return inputs;
}