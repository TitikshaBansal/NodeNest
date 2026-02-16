import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET - Get all workflow runs with node runs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: user.id },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Get all runs with node runs
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id },
      include: {
        nodeRuns: {
          include: {
            node: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 runs
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("Get workflow runs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow runs" },
      { status: 500 }
    );
  }
}

