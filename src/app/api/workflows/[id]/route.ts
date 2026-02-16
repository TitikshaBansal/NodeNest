import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Helper function to get or create user from Clerk
 */
async function getOrCreateUser(userId: string) {
    let user = await prisma.user.findUnique({
        where: { clerkId: userId },
    });

    if (!user) {
        try {
            const clerkUserResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
                },
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
            console.error("Failed to create user:", error);
            throw new Error(`User not found and failed to create: ${error.message}`);
        }
    }

    return user;
}

// GET - Get single workflow
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getOrCreateUser(userId);

        const { id } = await params;
        const workflow = await prisma.workflow.findFirst({
            where: {
                id,
                userId: user.id,
            },
            include: {
                nodes: true,
                edges: true,
            },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        // Transform response
        const transformedWorkflow = {
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
            })),
        };

        return NextResponse.json({ workflow: transformedWorkflow });
    } catch (error: any) {
        console.error("Get workflow error:", error);
        return NextResponse.json(
            { 
                error: "Failed to fetch workflow",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// PUT - Update workflow
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getOrCreateUser(userId);

        const { id } = await params;
        const body = await request.json();

        // Check workflow exists and belongs to user
        const existingWorkflow = await prisma.workflow.findFirst({
            where: { id, userId: user.id },
        });

        if (!existingWorkflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        // FIXED: Prepare all data BEFORE transaction, use createMany for speed
        // Build node ID mapping (frontend ID -> database ID that will be created)
        const nodeIdMap = new Map<string, string>();
        const nodesToCreate = (body.nodes || []).map((node: any) => {
            // Generate new database ID
            const dbId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            nodeIdMap.set(node.id, dbId);
            
            return {
                id: dbId,
                workflowId: id,
                type: node.type,
                positionX: node.position?.x || 0,
                positionY: node.position?.y || 0,
                data: node.data || {},
            };
        });

        // Build edges with mapped node IDs
        const edgesToCreate = (body.edges || []).map((edge: any) => {
            const mappedSourceId = nodeIdMap.get(edge.source);
            const mappedTargetId = nodeIdMap.get(edge.target);

            // Skip invalid edges
            if (!mappedSourceId || !mappedTargetId) {
                console.error(`Edge references non-existent node: ${edge.source} -> ${edge.target}`);
                return null;
            }

            return {
                id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                workflowId: id,
                sourceNodeId: mappedSourceId,
                targetNodeId: mappedTargetId,
                sourceHandle: edge.sourceHandle || null,
                targetHandle: edge.targetHandle || null,
            };
        }).filter(Boolean); // Remove nulls

        // Fast transaction: delete old, bulk create new
        const workflow = await prisma.$transaction(async (tx) => {
            // Delete old data
            await tx.edge.deleteMany({ where: { workflowId: id } });
            await tx.node.deleteMany({ where: { workflowId: id } });

            // Bulk create nodes (MUCH faster than loop)
            if (nodesToCreate.length > 0) {
                await tx.node.createMany({
                    data: nodesToCreate,
                });
            }

            // Bulk create edges (MUCH faster than loop)
            if (edgesToCreate.length > 0) {
                await tx.edge.createMany({
                    data: edgesToCreate as any[],
                });
            }

            // Update workflow name and get full result
            return await tx.workflow.update({
                where: { id },
                data: { name: body.name },
                include: {
                    nodes: true,
                    edges: true,
                },
            });
        }, {
            timeout: 10000, // 10 second timeout (increased from default 5s)
        });

        // Transform response
        const transformedWorkflow = {
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
            })),
        };

        return NextResponse.json({ workflow: transformedWorkflow });
    } catch (error: any) {
        console.error("Update workflow error:", error);
        return NextResponse.json(
            { 
                error: "Failed to update workflow",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// DELETE - Delete workflow
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getOrCreateUser(userId);

        const { id } = await params;
        
        // Check workflow exists and belongs to user, then delete (cascade will handle nodes/edges)
        const workflow = await prisma.workflow.findFirst({
            where: { id, userId: user.id },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        await prisma.workflow.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete workflow error:", error);
        return NextResponse.json(
            { 
                error: "Failed to delete workflow",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { status: 500 }
        );
    }
}