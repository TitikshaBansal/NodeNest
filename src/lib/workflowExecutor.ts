/**
 * Workflow Execution Engine
 * Fetches from database and executes nodes in topological order
 */

import { prisma } from "./prisma";
import {
  Node,
  Edge,
  detectCycles,
  buildExecutionGraph,
  getReadyNodes,
  collectNodeInputs,
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
    if (nodeType === "text") {
      return { success: true, output: inputs.content || "", duration: Date.now() - startTime };
    }

    if (nodeType === "image") {
      return {
        success: true,
        output: inputs.imageUrl || inputs.imageBase64 || "",
        duration: Date.now() - startTime,
      };
    }

    if (nodeType === "video") {
      return { success: true, output: inputs.videoUrl || "", duration: Date.now() - startTime };
    }

    if (nodeType === "llm") {
      // ✅ Call directly - no HTTP fetch to avoid Clerk auth issues on server-to-server calls
      const { executeLLMNode } = await import("./llmExecutor");

      const result = await executeLLMNode({
        userPrompt: inputs.user_message || inputs.userMessage || inputs.userPrompt || "",
        systemPrompt: inputs.system_prompt || inputs.systemPrompt || "",
        images: inputs.images || [],
      });

      if (!result.success) throw new Error(result.error || "LLM execution failed");

      return { success: true, output: result.output, duration: Date.now() - startTime };
    }

    if (nodeType === "cropImage" || nodeType === "crop") {
      const { runs } = await import("@trigger.dev/sdk");
      const { cropImage } = await import("../trigger/tasks/cropImage");

      const handle = await cropImage.trigger({
        nodeId,
        workflowRunId,
        inputs: {
          imageUrl: inputs.imageUrl || inputs.input || "",
          xPercent: inputs.xPercent ?? 0,
          yPercent: inputs.yPercent ?? 0,
          widthPercent: inputs.widthPercent ?? 100,
          heightPercent: inputs.heightPercent ?? 100,
        },
      });

      // Poll until complete
      let run = await runs.retrieve(handle.id);
      while (run.status === "WAITING" || run.status === "DEQUEUED" || run.status === "DELAYED" || run.status === "PENDING_VERSION") {
        await new Promise(r => setTimeout(r, 2000));
        run = await runs.retrieve(handle.id);
      }

      const cropFailed = run.status === "FAILED" || run.status === "CRASHED" || run.status === "SYSTEM_FAILURE" || run.status === "TIMED_OUT" || run.status === "CANCELED" || run.status === "EXPIRED";
      if (cropFailed || run.status !== "COMPLETED" || !run.output?.success) {
        throw new Error(run.output?.error || `Crop image task ended with status: ${run.status}`);
      }

      return { success: true, output: run.output.output, duration: Date.now() - startTime };
    }

    if (nodeType === "extractFrame") {
      const { runs } = await import("@trigger.dev/sdk");
      const { extractFrame } = await import("../trigger/tasks/extractFrame");

      const handle = await extractFrame.trigger({
        nodeId,
        workflowRunId,
        inputs: {
          videoUrl: inputs.videoUrl || inputs.input || "",
          timestamp: inputs.timestamp || "50%",
        },
      });

      // Poll until complete
      let run = await runs.retrieve(handle.id);
      while (run.status === "WAITING" || run.status === "DEQUEUED" || run.status === "DELAYED" || run.status === "PENDING_VERSION") {
        await new Promise(r => setTimeout(r, 2000));
        run = await runs.retrieve(handle.id);
      }

      const extractFailed = run.status === "FAILED" || run.status === "CRASHED" || run.status === "SYSTEM_FAILURE" || run.status === "TIMED_OUT" || run.status === "CANCELED" || run.status === "EXPIRED";
      if (extractFailed || run.status !== "COMPLETED" || !run.output?.success) {
        throw new Error(run.output?.error || `Extract frame task ended with status: ${run.status}`);
      }

      return { success: true, output: run.output.output, duration: Date.now() - startTime };
    }

    throw new Error(`Unknown node type: ${nodeType}`);
  } catch (error: any) {
    return { success: false, error: error.message, duration: Date.now() - startTime };
  }
}

/**
 * Validate DAG
 */
function validateDAG(nodes: Node[], edges: Edge[]): { valid: boolean; error?: string } {
  const cycle = detectCycles(nodes, edges);
  if (cycle) return { valid: false, error: `Workflow contains a cycle: ${cycle.join(" -> ")}` };

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      return { valid: false, error: `Edge references non-existent node: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { valid: false, error: `Edge references non-existent node: ${edge.target}` };
    }
  }

  return { valid: true };
}

/**
 * Execute a workflow - fetches from DB to use correct node IDs
 */
export async function executeWorkflow(
  workflowId: string,
  userId: string
): Promise<WorkflowExecutionResult> {
  console.log(`[Executor] Starting execution for workflow ${workflowId}`);

  // Fetch from database to get actual node IDs
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) throw new Error("Workflow not found or unauthorized");

  console.log(`[Executor] Found ${workflow.nodes.length} nodes, ${workflow.edges.length} edges`);

  // Log node IDs for debugging
  workflow.nodes.forEach((n) => console.log(`  Node: ${n.id} (${n.type})`));
  workflow.edges.forEach((e) => console.log(`  Edge: ${e.sourceNodeId} → ${e.targetNodeId}`));

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
  if (!validation.valid) throw new Error(validation.error);

  // Create workflow run
  const workflowRun = await prisma.workflowRun.create({
    data: { workflowId, status: "running", startedAt: new Date() },
  });

  console.log(`[Executor] Created workflow run: ${workflowRun.id}`);

  // Create node runs using database node IDs
  const nodeRuns = new Map<string, any>();
  for (const node of nodes) {
    const nodeRun = await prisma.nodeRun.create({
      data: {
        workflowRunId: workflowRun.id,
        nodeId: node.id, // ✅ Using database node ID
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
    const completed = new Set<string>();
    let waveNumber = 0;

    while (completed.size < nodes.length) {
      waveNumber++;
      const readyNodes = getReadyNodes(executionNodes);

      if (readyNodes.length === 0) {
        throw new Error("Execution deadlock: no nodes are ready to execute");
      }

      console.log(`[Wave ${waveNumber}] Executing ${readyNodes.length} nodes in parallel`);

      await Promise.all(
        readyNodes.map(async (execNode) => {
          const nodeId = execNode.node.id;
          const nodeType = execNode.node.type;

          try {
            // ✅ Check if any dependency failed - if so, skip this node
            const hasFailedDep = execNode.dependencies.some((depId) => {
              return executionNodes.get(depId)?.status === "failed";
            });

            if (hasFailedDep) {
              execNode.status = "failed";
              execNode.error = "Skipped: a dependency node failed";
              errors.set(nodeId, "Skipped: a dependency node failed");

              await prisma.nodeRun.update({
                where: { id: nodeRuns.get(nodeId).id },
                data: {
                  status: "failed",
                  error: "Skipped: a dependency node failed",
                  completedAt: new Date(),
                },
              });

              console.log(`[Wave ${waveNumber}] ⏭️ Node ${nodeId} skipped (dependency failed)`);
              completed.add(nodeId);
              return;
            }

            execNode.status = "running";
            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: { status: "running", startedAt: new Date() },
            });

            // Collect inputs from dependencies
            const depInputs = collectNodeInputs(nodeId, executionNodes, edges, nodeType);

            // Merge with node's own data
            const nodeInputs = { ...execNode.node.data, ...depInputs };

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: { inputs: nodeInputs },
            });

            const result = await executeNode(nodeId, nodeType, nodeInputs, workflowRun.id);

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

              console.log(`[Wave ${waveNumber}] ✅ Node ${nodeId} (${nodeType}) completed`);
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

              console.log(`[Wave ${waveNumber}] ❌ Node ${nodeId} failed: ${result.error}`);
            }

            completed.add(nodeId);
          } catch (error: any) {
            execNode.status = "failed";
            execNode.error = error.message;
            errors.set(nodeId, error.message);

            await prisma.nodeRun.update({
              where: { id: nodeRuns.get(nodeId).id },
              data: { status: "failed", error: error.message, completedAt: new Date() },
            });

            console.error(`[Wave ${waveNumber}] ❌ Node ${nodeId} error:`, error.message);
            completed.add(nodeId);
          }
        })
      );

      console.log(`[Wave ${waveNumber}] Done. Progress: ${completed.size}/${nodes.length}`);
    }

    const hasErrors = errors.size > 0;
    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: hasErrors ? "failed" : "completed",
        completedAt: new Date(),
        error: hasErrors ? Array.from(errors.values()).join("; ") : null,
      },
    });

    console.log(`[Executor] Workflow ${hasErrors ? "❌ failed" : "✅ completed"}`);

    return {
      workflowRunId: workflowRun.id,
      status: hasErrors ? "failed" : "completed",
      nodeResults,
      errors,
    };
  } catch (error: any) {
    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: { status: "failed", completedAt: new Date(), error: error.message },
    });
    throw error;
  }
}