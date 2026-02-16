import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { executeWorkflow } from "@/lib/workflowExecutor";

// POST - Execute workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    // Execute workflow (this will run asynchronously)
    const result = await executeWorkflow(id, user.id);

    return NextResponse.json({
      success: true,
      workflowRunId: result.workflowRunId,
      status: result.status,
      nodeResults: Object.fromEntries(result.nodeResults),
      errors: Object.fromEntries(result.errors),
    });
  } catch (error: any) {
    console.error("Execute workflow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute workflow" },
      { status: 500 }
    );
  }
}

