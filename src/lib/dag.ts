/**
 * DAG (Directed Acyclic Graph) Execution Engine
 * Handles topological sorting, cycle detection, and parallel execution
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
  dependencies: string[]; // IDs of nodes that must complete before this
  dependents: string[]; // IDs of nodes that depend on this
  status: "pending" | "ready" | "running" | "completed" | "failed";
  inputs: Record<string, any>;
  output?: any;
  error?: string;
}

/**
 * Detect cycles in the graph using DFS
 */
export function detectCycles(nodes: Node[], edges: Edge[]): string[] | null {
  const graph = new Map<string, string[]>();
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycle: string[] = [];

  // Build adjacency list
  for (const edge of edges) {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  }

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    cycle.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        cycle.push(neighbor);
        return true;
      }
    }

    recStack.delete(nodeId);
    cycle.pop();
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Topological sort using Kahn's algorithm
 * Returns nodes in execution order (dependencies first)
 */
export function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  // Initialize in-degree for all nodes
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    graph.set(node.id, []);
  }

  // Build graph and calculate in-degrees
  for (const edge of edges) {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: Node[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Process nodes
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeMap.get(nodeId)!);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check if all nodes were processed (no cycles)
  if (result.length !== nodes.length) {
    throw new Error("Graph contains cycles or disconnected nodes");
  }

  return result;
}

/**
 * Build execution graph with dependency information
 */
export function buildExecutionGraph(
  nodes: Node[],
  edges: Edge[]
): Map<string, ExecutionNode> {
  const executionNodes = new Map<string, ExecutionNode>();

  // Initialize execution nodes
  for (const node of nodes) {
    executionNodes.set(node.id, {
      node,
      dependencies: [],
      dependents: [],
      status: "pending",
      inputs: {},
    });
  }

  // Build dependency graph
  for (const edge of edges) {
    const source = executionNodes.get(edge.source);
    const target = executionNodes.get(edge.target);

    if (source && target) {
      // Target depends on source
      if (!target.dependencies.includes(edge.source)) {
        target.dependencies.push(edge.source);
      }
      // Source has target as dependent
      if (!source.dependents.includes(edge.target)) {
        source.dependents.push(edge.target);
      }
    }
  }

  return executionNodes;
}

/**
 * Get nodes that are ready to execute (all dependencies completed)
 */
export function getReadyNodes(
  executionNodes: Map<string, ExecutionNode>
): ExecutionNode[] {
  const ready: ExecutionNode[] = [];

  for (const execNode of executionNodes.values()) {
    if (execNode.status === "pending") {
      const allDependenciesCompleted = execNode.dependencies.every(
        (depId) => executionNodes.get(depId)?.status === "completed"
      );

      if (allDependenciesCompleted) {
        ready.push(execNode);
      }
    }
  }

  return ready;
}

/**
 * Collect inputs for a node from its dependencies
 */
export function collectNodeInputs(
  nodeId: string,
  executionNodes: Map<string, ExecutionNode>,
  edges: Edge[],
  nodeType?: string
): Record<string, any> {
  const inputs: Record<string, any> = {};

  // Find all edges that target this node
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  for (const edge of incomingEdges) {
    const sourceNode = executionNodes.get(edge.source);
    if (sourceNode && sourceNode.status === "completed" && sourceNode.output) {
      const targetHandle = edge.targetHandle || "default";
      const sourceHandle = edge.sourceHandle || "output";

      // LLM node handles
      if (nodeType === "llm") {
        if (targetHandle === "system_prompt") {
          inputs.systemPrompt = sourceNode.output;
        } else if (targetHandle === "user_message") {
          inputs.userPrompt = sourceNode.output; // Map to userPrompt for Trigger.dev task
        } else if (targetHandle?.startsWith("images-")) {
          if (!inputs.images) {
            inputs.images = [];
          }
          inputs.images.push(sourceNode.output);
        }
      }
      // Crop Image node handles
      else if (nodeType === "crop") {
        if (targetHandle === "image_url") {
          inputs.imageUrl = sourceNode.output;
        } else if (targetHandle === "x_percent") {
          inputs.xPercent = parseFloat(sourceNode.output) || 0;
        } else if (targetHandle === "y_percent") {
          inputs.yPercent = parseFloat(sourceNode.output) || 0;
        } else if (targetHandle === "width_percent") {
          inputs.widthPercent = parseFloat(sourceNode.output) || 100;
        } else if (targetHandle === "height_percent") {
          inputs.heightPercent = parseFloat(sourceNode.output) || 100;
        }
      }
      // Extract Frame node handles
      else if (nodeType === "extractFrame") {
        if (targetHandle === "video_url") {
          inputs.videoUrl = sourceNode.output;
        } else if (targetHandle === "timestamp") {
          inputs.timestamp = sourceNode.output;
        }
      }
      // Legacy/fallback handling
      else {
        if (sourceHandle === "output") {
          // Text output
          if (targetHandle === "prompt" || targetHandle === "user_message") {
            inputs.userPrompt = sourceNode.output;
          } else {
            inputs[targetHandle] = sourceNode.output;
          }
        } else if (sourceHandle === "image-output" || targetHandle?.startsWith("image-") || targetHandle?.startsWith("images-")) {
          // Image output
          if (!inputs.images) {
            inputs.images = [];
          }
          inputs.images.push(sourceNode.output);
        } else {
          // Default: use output directly
          inputs[targetHandle] = sourceNode.output;
        }
      }
    }
  }

  return inputs;
}

