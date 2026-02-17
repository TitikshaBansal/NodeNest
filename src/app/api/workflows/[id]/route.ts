import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser(userId: string) {
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
        try {
            const clerkUserResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
            });

            if (!clerkUserResponse.ok) {
                throw new Error(`Failed to fetch user from Clerk: ${clerkUserResponse.status}`);
            }

            const clerkUser = await clerkUserResponse.json();

            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: clerkUser.email_addresses?.[0]?.email_address || `user-${userId}@example.com`,
                    name: clerkUser.first_name || clerkUser.username || null,
                    imageUrl: clerkUser.image_url || null,
                },
            });

            console.log("User auto-created:", user.id);
        } catch (error: any) {
            throw new Error(`User not found and failed to create: ${error.message}`);
        }
    }

    return user;
}

// GET - Get single workflow
export async function GET(
    request: NextRequest,
    { params }: any
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await getOrCreateUser(userId);
        const { id } = await params;

        const workflow = await prisma.workflow.findFirst({
            where: { id, userId: user.id },
            include: { nodes: true, edges: true },
        });

        if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

        return NextResponse.json({
            workflow: {
                id: workflow.id,
                name: workflow.name,
                updatedAt: workflow.updatedAt.toISOString(),
                nodes: workflow.nodes.map((n) => ({
                    id: n.id,
                    type: n.type,
                    position: { x: n.positionX, y: n.positionY },
                    data: n.data,
                })),
                edges: workflow.edges.map((e) => ({
                    id: e.id,
                    source: e.sourceNodeId,
                    target: e.targetNodeId,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                    animated: true,
                    style: { stroke: "#444", strokeWidth: 2 },
                })),
            },
        });
    } catch (error: any) {
        console.error("Get workflow error:", error);
        return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
    }
}

// PUT - Update workflow
export async function PUT(
    request: NextRequest,
    { params }: any
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await getOrCreateUser(userId);
        const { id } = await params;
        const body = await request.json();

        const existingWorkflow = await prisma.workflow.findFirst({
            where: { id, userId: user.id },
        });

        if (!existingWorkflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        // ✅ THE FIX: Use frontend node IDs directly - do NOT generate new IDs!
        // Generating new IDs on every save was causing the foreign key errors.
        const nodesToCreate = (body.nodes || []).map((node: any) => ({
            id: node.id,           // ← Use frontend ID as-is
            workflowId: id,
            type: node.type,
            positionX: node.position?.x ?? 0,
            positionY: node.position?.y ?? 0,
            data: node.data ?? {},
        }));

        // Build a set of valid node IDs for edge validation
        const nodeIdSet = new Set(nodesToCreate.map((n: any) => n.id));

        // Only create edges where both source and target exist in this save
        const edgesToCreate = (body.edges || [])
            .filter((edge: any) => {
                const valid = nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target);
                if (!valid) {
                    console.warn(`Skipping edge with missing node: ${edge.source} → ${edge.target}`);
                }
                return valid;
            })
            .map((edge: any) => ({
                id: edge.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                workflowId: id,
                sourceNodeId: edge.source,
                targetNodeId: edge.target,
                sourceHandle: edge.sourceHandle ?? null,
                targetHandle: edge.targetHandle ?? null,
            }));

        console.log(`[PUT] Saving workflow ${id}: ${nodesToCreate.length} nodes, ${edgesToCreate.length} edges`);

        const workflow = await prisma.$transaction(async (tx) => {
            await tx.edge.deleteMany({ where: { workflowId: id } });
            await tx.node.deleteMany({ where: { workflowId: id } });

            if (nodesToCreate.length > 0) {
                await tx.node.createMany({ data: nodesToCreate });
            }

            if (edgesToCreate.length > 0) {
                await tx.edge.createMany({ data: edgesToCreate });
            }

            return await tx.workflow.update({
                where: { id },
                data: { name: body.name ?? existingWorkflow.name },
                include: { nodes: true, edges: true },
            });
        }, { timeout: 15000 });

        return NextResponse.json({
            workflow: {
                id: workflow.id,
                name: workflow.name,
                updatedAt: workflow.updatedAt.toISOString(),
                nodes: workflow.nodes.map((n) => ({
                    id: n.id,
                    type: n.type,
                    position: { x: n.positionX, y: n.positionY },
                    data: n.data,
                })),
                edges: workflow.edges.map((e) => ({
                    id: e.id,
                    source: e.sourceNodeId,
                    target: e.targetNodeId,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                    animated: true,
                    style: { stroke: "#444", strokeWidth: 2 },
                })),
            },
        });
    } catch (error: any) {
        console.error("Update workflow error:", error);
        return NextResponse.json(
            { error: "Failed to update workflow", details: process.env.NODE_ENV === "development" ? error.message : undefined },
            { status: 500 }
        );
    }
}

// DELETE - Delete workflow
export async function DELETE(
    request: NextRequest,
    { params }: any
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await getOrCreateUser(userId);
        const { id } = await params;

        const workflow = await prisma.workflow.findFirst({
            where: { id, userId: user.id },
        });

        if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

        await prisma.workflow.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete workflow error:", error);
        return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
    }
}