/**
 * Workflow Execution Engine
 * PHASE 3: Integrated with Trigger.dev tasks
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
import { generateGeminiContent, cropImage, extractFrame } from "@/trigger/tasks";

/**
 * Execute a node using Trigger.dev tasks or direct execution
 * Text and image nodes don't need Trigger.dev (they're pass-through)
 */
async function executeNode(
  nodeId: string,
  nodeType: string,
  inputs: any,
  workflowRunId: string
): Promise<{ success: boolean; output?: any; error?: string; duration: number; triggerTaskId?: string }> {
  const startTime = Date.now();

  try {
    // Text and image nodes are pass-through (no Trigger.dev needed)
    if (nodeType === "text") {
      const duration = Date.now() - startTime;
      return {
        success: true,
        output: inputs.content || "",
        duration,
      };
    }

    if (nodeType === "image") {
      const duration = Date.now() - startTime;
      return {
        success: true,
        output: inputs.imageUrl || inputs.imageBase64 || "",
        duration,
      };
    }

    if (nodeType === "video") {
      const duration = Date.now() - startTime;
      return {
        success: true,
        output: inputs.videoUrl || "",
        duration,
      };
    }

    // LLM, crop, and extractFrame nodes use Trigger.dev
    let taskRunResult;

    switch (nodeType) {
      case "llm":
        taskRunResult = await generateGeminiContent.triggerAndWait({
          nodeId,
          workflowRunId,
          inputs,
        });
        break;

      case "crop":
        taskRunResult = await cropImage.triggerAndWait({
          nodeId,
          workflowRunId,
          inputs,
        });
        break;

      case "extractFrame":
        taskRunResult = await extractFrame.triggerAndWait({
          nodeId,
          workflowRunId,
          inputs,
        });
        break;

      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }

    const duration = Date.now() - startTime;

    // Handle TaskRunResult structure from triggerAndWait()
    if (!taskRunResult.ok) {
      // Trigger.dev task failed to execute
      return {
        success: false,
        error: typeof taskRunResult.error === 'string' ? taskRunResult.error : 'Task execution failed',
        duration,
        triggerTaskId: taskRunResult.id,
      };
    }

    // Task executed successfully, extract the actual result from output property
    const taskResult = taskRunResult.output;

    return {
      success: taskResult.success,
      output: taskResult.output,
      error: taskResult.error,
      duration: taskResult.duration || duration,
      triggerTaskId: taskRunResult.id,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error.message || "Execution failed",
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

export interface WorkflowExecutionResult {
  workflowRunId: string;
  status: "completed" | "failed";
  nodeResults: Map<string, any>;
  errors: Map<string, string>;
}

/**
 * Execute a workflow
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

  // Create node runs
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

  // Topological sort for execution order
  const sortedNodes = topologicalSort(nodes, edges);

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
          const inputs = collectNodeInputs(nodeId, executionNodes, edges, nodeType);

          // Merge with node's own data
          // For crop nodes, merge percentage values from node data if not connected
          let nodeInputs: any = {
            ...execNode.node.data,
            ...inputs,
          };

          // For crop nodes, ensure percentages are set from node data if not connected
          if (nodeType === "crop") {
            const cropData = execNode.node.data as any;
            if (!inputs.xPercent && cropData.xPercent !== undefined) {
              nodeInputs.xPercent = cropData.xPercent;
            }
            if (!inputs.yPercent && cropData.yPercent !== undefined) {
              nodeInputs.yPercent = cropData.yPercent;
            }
            if (!inputs.widthPercent && cropData.widthPercent !== undefined) {
              nodeInputs.widthPercent = cropData.widthPercent;
            }
            if (!inputs.heightPercent && cropData.heightPercent !== undefined) {
              nodeInputs.heightPercent = cropData.heightPercent;
            }
            if (!inputs.imageUrl && cropData.imageUrl) {
              nodeInputs.imageUrl = cropData.imageUrl;
            }
          }

          // For extractFrame nodes, ensure timestamp is set from node data if not connected
          if (nodeType === "extractFrame") {
            const extractData = execNode.node.data as any;
            if (!inputs.timestamp && extractData.timestamp !== undefined) {
              nodeInputs.timestamp = extractData.timestamp;
            }
            if (!inputs.videoUrl && extractData.videoUrl) {
              nodeInputs.videoUrl = extractData.videoUrl;
            }
          }

          // For LLM nodes, ensure model and prompts are set from node data if not connected
          if (nodeType === "llm") {
            const llmData = execNode.node.data as any;
            if (!inputs.model && llmData.model) {
              nodeInputs.model = llmData.model;
            }
            if (!inputs.systemPrompt && llmData.systemPrompt) {
              nodeInputs.systemPrompt = llmData.systemPrompt;
            }
            if (!inputs.userPrompt && llmData.userMessage) {
              nodeInputs.userPrompt = llmData.userMessage;
            }
          }

          // Update inputs in database
          await prisma.nodeRun.update({
            where: { id: nodeRuns.get(nodeId).id },
            data: { inputs: nodeInputs },
          });

          // PHASE 3: Execute node using Trigger.dev tasks or direct execution
          const taskResult = await executeNode(
            nodeId,
            nodeType,
            nodeInputs,
            workflowRun.id
          );

          // Update execution node and database
          if (taskResult.success) {
            execNode.status = "completed";
            execNode.output = taskResult.output;
            nodeResults.set(nodeId, taskResult.output);

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: {
                status: "completed",
                outputs: { output: taskResult.output },
                duration: taskResult.duration,
                triggerTaskId: taskResult.triggerTaskId || null,
                completedAt: new Date(),
              },
            });

            console.log(`[Wave ${waveNumber}] Node ${nodeId} completed`);
          } else {
            execNode.status = "failed";
            execNode.error = taskResult.error;
            errors.set(nodeId, taskResult.error || "Unknown error");

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: {
                status: "failed",
                error: taskResult.error,
                duration: taskResult.duration,
                triggerTaskId: taskResult.triggerTaskId || null,
                completedAt: new Date(),
              },
            });

            console.log(`[Wave ${waveNumber}] Node ${nodeId} failed: ${taskResult.error}`);
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