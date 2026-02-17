import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { executeWorkflow } from "@/lib/workflowExecutor";

export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Get the database user ID (not Clerk ID)
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: workflowId } = await params;

    console.log(`[Execute] Starting workflow ${workflowId} for user ${user.id}`);

    // Execute using database user ID
    const result = await executeWorkflow(workflowId, user.id);

    return NextResponse.json({
      success: result.status === "completed",
      workflowRunId: result.workflowRunId,
      status: result.status,
      errors: result.errors.size > 0 ? Array.from(result.errors.entries()) : undefined,
    });
  } catch (error: any) {
    console.error("[Execute] Failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Workflow execution failed" },
      { status: 500 }
    );
  }
}