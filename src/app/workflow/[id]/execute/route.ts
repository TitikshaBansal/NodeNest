import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeWorkflow } from "@/lib/workflowExecutor";

/**
 * Execute a workflow
 * POST /api/workflows/[id]/execute
 */
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await params;

    console.log(`[Execute Route] Starting execution for workflow ${workflowId}`);

    // Execute workflow (fetches from database internally)
    const result = await executeWorkflow(workflowId, userId);

    console.log(`[Execute Route] Execution completed:`, {
      workflowRunId: result.workflowRunId,
      status: result.status,
      nodeCount: result.nodeResults.size,
      errorCount: result.errors.size,
    });

    return NextResponse.json({
      success: result.status === "completed",
      workflowRunId: result.workflowRunId,
      status: result.status,
      errors: result.errors.size > 0 ? Array.from(result.errors.entries()) : undefined,
    });
  } catch (error: any) {
    console.error("[Execute Route] Execution failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Workflow execution failed",
      },
      { status: 500 }
    );
  }
}