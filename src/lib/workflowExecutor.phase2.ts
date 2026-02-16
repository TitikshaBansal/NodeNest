/**
 * Workflow Execution Engine
 * Uses database node IDs and wave-based parallel execution
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
 * Execute a node based on its type
 */
async function executeNode(
  nodeId: string,
  nodeType: string,
  inputs: any,
  workflowRunId: string
): Promise<{ success: boolean; output?: any; error?: string; duration: number }> {
  const startTime = Date.now();

  try {
    // Pass-through nodes (no processing needed)
    if (nodeType === "text") {
      return {
        success: true,
        output: inputs.content || "",
        duration: Date.now() - startTime,
      };
    }

    if (nodeType === "image") {
      return {
        success: true,
        output: inputs.imageUrl || inputs.imageBase64 || "",
        duration: Date.now() - startTime,
      };
    }

    if (nodeType === "video") {
      return {
        success: true,
        output: inputs.videoUrl || "",
        duration: Date.now() - startTime,
      };
    }

    // LLM node - call execute-node API
    if (nodeType === "llm") {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/execute-node`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId,
            nodeType: "llm",
            inputs: {
              userPrompt: inputs.user_message || inputs.userPrompt || inputs.userMessage || "",
              systemPrompt: inputs.system_prompt || inputs.systemPrompt,
              images: inputs.images || [],
            },
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "LLM execution failed");
      }

      return {
        success: true,
        output: result.output,
        duration: Date.now() - startTime,
      };
    }

    // cropImage and extractFrame nodes (placeholder for Trigger.dev)
    if (nodeType === "cropImage") {
      // TODO: Implement Trigger.dev task execution
      console.warn("cropImage node not yet implemented, passing through input");
      return {
        success: true,
        output: inputs.imageUrl || inputs.input || "",
        duration: Date.now() - startTime,
      };
    }

    if (nodeType === "extractFrame") {
      // TODO: Implement Trigger.dev task execution
      console.warn("extractFrame node not yet implemented, passing through input");
      return {
        success: true,
        output: inputs.videoUrl || inputs.input || "",
        duration: Date.now() - startTime,
      };
    }

    throw new Error(`Unknown node type: ${nodeType}`);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Execution failed",
      duration: Date.now() - startTime,
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
 * ✅ CRITICAL: Uses database node IDs, not frontend IDs
 */
export async function executeWorkflow(
  workflowId: string,
  userId: string
): Promise<WorkflowExecutionResult> {
  console.log(`[Workflow Executor] Starting execution for workflow ${workflowId}`);

  // ✅ CRITICAL FIX: Fetch workflow from database with actual node IDs
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) {
    throw new Error("Workflow not found or unauthorized");
  }

  console.log(
    `[Workflow Executor] Found workflow with ${workflow.nodes.length} nodes and ${workflow.edges.length} edges`
  );

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

  console.log(`[Workflow Executor] Created workflow run: ${workflowRun.id}`);

  // Create node runs (using database node IDs)
  const nodeRuns = new Map<string, any>();
  for (const node of nodes) {
    const nodeRun = await prisma.nodeRun.create({
      data: {
        workflowRunId: workflowRun.id,
        nodeId: node.id, // ✅ Database node ID
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
    // Wave-based execution: execute nodes in waves
    const completed = new Set<string>();
    let waveNumber = 0;

    while (completed.size < nodes.length) {
      waveNumber++;
      console.log(`[Wave ${waveNumber}] Starting execution wave...`);

      // Get all ready nodes (dependencies completed)
      const readyNodes = getReadyNodes(executionNodes);

      if (readyNodes.length === 0) {
        throw new Error("Execution deadlock: no nodes ready but workflow incomplete");
      }

      console.log(`[Wave ${waveNumber}] Executing ${readyNodes.length} nodes in parallel`);

      // Execute ready nodes in parallel
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
          const inputs = collectNodeInputs(nodeId, executionNodes, edges, nodeType);

          // Merge with node's own data
          const nodeInputs = {
            ...execNode.node.data,
            ...inputs,
          };

          console.log(`[Wave ${waveNumber}] Node ${nodeId} (${nodeType}) inputs:`, nodeInputs);

          // Update inputs in database
          await prisma.nodeRun.update({
            where: { id: nodeRuns.get(nodeId).id },
            data: { inputs: nodeInputs },
          });

          // Execute node
          const result = await executeNode(nodeId, nodeType, nodeInputs, workflowRun.id);

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

            console.log(`[Wave ${waveNumber}] Node ${nodeId} completed successfully`);
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

      console.log(
        `[Wave ${waveNumber}] Completed. Total: ${completed.size}/${nodes.length}`
      );
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