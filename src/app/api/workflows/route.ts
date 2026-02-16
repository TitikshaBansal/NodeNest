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
        // User doesn't exist - fetch from Clerk and create
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

// GET - Get all workflows for current user
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" }, 
                { 
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );
        }

        // Get or create user
        const user = await getOrCreateUser(userId);

        const workflows = await prisma.workflow.findMany({
            where: { userId: user.id },
            include: {
                nodes: true,
                edges: true,
            },
            orderBy: { updatedAt: "desc" },
        });

        // Transform to match frontend expectations
        const transformedWorkflows = workflows.map((wf) => ({
            id: wf.id,
            name: wf.name,
            updatedAt: wf.updatedAt.toISOString(),
            nodes: wf.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: { x: n.positionX, y: n.positionY },
                data: n.data,
            })),
            edges: wf.edges.map((e) => ({
                id: e.id,
                source: e.sourceNodeId,
                target: e.targetNodeId,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
            })),
        }));

        return NextResponse.json({ workflows: transformedWorkflows });
    } catch (error: any) {
        console.error("Get workflows error:", error);
        return NextResponse.json(
            { 
                error: "Failed to fetch workflows",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { 
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
    }
}

// POST - Create new workflow
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" }, 
                { 
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );
        }

        // Get or create user
        const user = await getOrCreateUser(userId);

        const body = await request.json();

        // Create workflow with nodes and edges
        const workflow = await prisma.workflow.create({
            data: {
                userId: user.id,
                name: body.name || "Untitled Workflow",
                nodes: {
                    create: (body.nodes || []).map((node: any) => ({
                        type: node.type,
                        positionX: node.position?.x || 0,
                        positionY: node.position?.y || 0,
                        data: node.data || {},
                    })),
                },
                edges: {
                    create: (body.edges || []).map((edge: any) => ({
                        sourceNodeId: edge.source,
                        targetNodeId: edge.target,
                        sourceHandle: edge.sourceHandle || null,
                        targetHandle: edge.targetHandle || null,
                    })),
                },
            },
            include: {
                nodes: true,
                edges: true,
            },
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
        console.error("Create workflow error:", error);
        return NextResponse.json(
            { 
                error: "Failed to create workflow",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { 
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
    }
}