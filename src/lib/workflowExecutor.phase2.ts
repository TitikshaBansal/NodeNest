/**
 * PHASE 2: Workflow Execution Engine with Mock Tasks
 * This version uses mock execution to test DAG logic before Trigger.dev integration
 */

import { prisma } from "./prisma";
import {
  Node,
  Edge,
  detectCycles,
  topologicalSort,
  buildExecutionGraph,
  getReadyNodes,
  collectNodeInputs,
  ExecutionNode,
} from "./dag";

export interface WorkflowExecutionResult {
  workflowRunId: string;
  status: "completed" | "failed";
  nodeResults: Map<string, any>;
  errors: Map<string, string>;
}

/**
 * Mock node execution - simulates async task execution
 * This will be replaced with Trigger.dev tasks in Phase 3
 */
async function executeNodeMock(
  nodeId: string,
  nodeType: string,
  inputs: any
): Promise<{ success: boolean; output?: any; error?: string; duration: number }> {
  const startTime = Date.now();

  // Simulate async work
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  const duration = Date.now() - startTime;

  // Mock different node types
  switch (nodeType) {
    case "text":
      return {
        success: true,
        output: inputs.content || "Mock text output",
        duration,
      };

    case "image":
      return {
        success: true,
        output: inputs.imageUrl || "https://via.placeholder.com/300",
        duration,
      };

    case "llm":
      // Mock LLM response
      const mockResponse = `Mock LLM response for: ${inputs.userPrompt || inputs.systemPrompt || "prompt"}`;
      return {
        success: true,
        output: mockResponse,
        duration,
      };

    case "crop":
      return {
        success: true,
        output: inputs.imageUrl || "https://via.placeholder.com/300",
        duration,
      };

    case "extractFrame":
      return {
        success: true,
        output: inputs.videoUrl || "https://via.placeholder.com/300",
        duration,
      };

    default:
      // Simulate occasional failures for testing
      if (Math.random() < 0.1) {
        return {
          success: false,
          error: `Mock error for node ${nodeId}`,
          duration,
        };
      }
      return {
        success: true,
        output: `Mock output for ${nodeType}`,
        duration,
      };
  }
}

/**
 * Validate DAG structure
 */
function validateDAG(nodes: Node[], edges: Edge[]): { valid: boolean; error?: string } {
  // Check for cycles
  const cycle = detectCycles(nodes, edges);
  if (cycle) {
    return {
      valid: false,
      error: `Workflow contains a cycle: ${cycle.join(" -> ")}`,
    };
  }

  // Check for disconnected nodes (optional - might be valid)
  // Check for invalid node references in edges
  for (const edge of edges) {
    const sourceExists = nodes.some((n) => n.id === edge.source);
    const targetExists = nodes.some((n) => n.id === edge.target);

    if (!sourceExists || !targetExists) {
      return {
        valid: false,
        error: `Edge references non-existent node: ${!sourceExists ? edge.source : edge.target}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Execute a workflow using wave-based parallel execution
 * Phase 2: Uses mock execution, no Trigger.dev yet
 */
export async function executeWorkflow(
  workflowId: string,
  userId: string
): Promise<WorkflowExecutionResult> {
  // Get workflow from database
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  // Transform to execution format
  const nodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    data: n.data as any,
  }));

  const edges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
  }));

  // Validate DAG
  const validation = validateDAG(nodes, edges);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid workflow structure");
  }

  // Create workflow run
  const workflowRun = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: "running",
      startedAt: new Date(),
    },
  });

  // Create node runs for all nodes
  const nodeRuns = new Map<string, any>();
  for (const node of nodes) {
    const nodeRun = await prisma.nodeRun.create({
      data: {
        workflowRunId: workflowRun.id,
        nodeId: node.id,
        status: "pending",
        inputs: {},
      },
    });
    nodeRuns.set(node.id, nodeRun);
  }

  // Build execution graph
  const executionNodes = buildExecutionGraph(nodes, edges);

  const nodeResults = new Map<string, any>();
  const errors = new Map<string, string>();

  try {
    // Wave-based execution: execute nodes in waves, where each wave contains
    // nodes that can run in parallel (all dependencies satisfied)
    const completed = new Set<string>();
    let waveNumber = 0;

    while (completed.size < nodes.length) {
      waveNumber++;
      console.log(`[Wave ${waveNumber}] Starting execution wave...`);

      // Get all ready nodes (dependencies completed)
      const readyNodes = getReadyNodes(executionNodes);

      if (readyNodes.length === 0) {
        // No ready nodes but not all completed - deadlock
        throw new Error("Execution deadlock: no nodes ready but workflow incomplete");
      }

      console.log(`[Wave ${waveNumber}] Executing ${readyNodes.length} nodes in parallel`);

      // Execute ready nodes in parallel (TRUE parallelism with Promise.all)
      const executionPromises = readyNodes.map(async (execNode) => {
        const nodeId = execNode.node.id;
        const nodeType = execNode.node.type;

        try {
          // Update status to running
          execNode.status = "running";
          await prisma.nodeRun.update({
            where: { id: nodeRuns.get(nodeId).id },
            data: { status: "running", startedAt: new Date() },
          });

          // Collect inputs from dependencies
          const inputs = collectNodeInputs(nodeId, executionNodes, edges);

          // Merge with node's own data
          const nodeInputs = {
            ...execNode.node.data,
            ...inputs,
          };

          // Update inputs in database
          await prisma.nodeRun.update({
            where: { id: nodeRuns.get(nodeId).id },
            data: { inputs: nodeInputs },
          });

          // Execute node (MOCK - will be replaced with Trigger.dev in Phase 3)
          const result = await executeNodeMock(nodeId, nodeType, nodeInputs);

          // Update execution node and database
          if (result.success) {
            execNode.status = "completed";
            execNode.output = result.output;
            nodeResults.set(nodeId, result.output);

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: {
                status: "completed",
                outputs: { output: result.output },
                duration: result.duration,
                completedAt: new Date(),
              },
            });

            console.log(`[Wave ${waveNumber}] Node ${nodeId} completed`);
          } else {
            execNode.status = "failed";
            execNode.error = result.error;
            errors.set(nodeId, result.error || "Unknown error");

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: {
                status: "failed",
                error: result.error,
                duration: result.duration,
                completedAt: new Date(),
              },
            });

            console.log(`[Wave ${waveNumber}] Node ${nodeId} failed: ${result.error}`);
          }

          completed.add(nodeId);
        } catch (error: any) {
          execNode.status = "failed";
          const errorMsg = error.message || "Execution failed";
          execNode.error = errorMsg;
          errors.set(nodeId, errorMsg);

          await prisma.nodeRun.update({
            where: { id: nodeRuns.get(nodeId).id },
            data: {
              status: "failed",
              error: errorMsg,
              completedAt: new Date(),
            },
          });

          console.error(`[Wave ${waveNumber}] Node ${nodeId} error:`, errorMsg);
          completed.add(nodeId);
        }
      });

      // Wait for all parallel executions in this wave to complete
      await Promise.all(executionPromises);

      console.log(`[Wave ${waveNumber}] Completed. Total completed: ${completed.size}/${nodes.length}`);
    }

    // Update workflow run status
    const hasErrors = errors.size > 0;
    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: hasErrors ? "failed" : "completed",
        completedAt: new Date(),
        error: hasErrors ? Array.from(errors.values()).join("; ") : null,
      },
    });

    console.log(`Workflow execution completed. Status: ${hasErrors ? "failed" : "completed"}`);

    return {
      workflowRunId: workflowRun.id,
      status: hasErrors ? "failed" : "completed",
      nodeResults,
      errors,
    };
  } catch (error: any) {
    // Mark workflow as failed
    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error.message || "Workflow execution failed",
      },
    });

    throw error;
  }
}

