import { NextRequest, NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint is deprecated.
 * 
 * Use workflow execution instead:
 * POST /api/workflows/[id]/execute
 * 
 * This endpoint is kept for backward compatibility but will be removed in a future version.
 * All LLM execution now goes through Trigger.dev tasks via the workflow execution engine.
 */
export async function POST(request: NextRequest) {
    return NextResponse.json(
        {
            success: false,
            error: "This endpoint is deprecated. Please use workflow execution instead: POST /api/workflows/[id]/execute",
            deprecated: true,
        },
        { status: 410 } // 410 Gone
    );
}
