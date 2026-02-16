import { z } from 'zod';

// Schema for LLM API request validation
export const llmRequestSchema = z.object({
    model: z.string().min(1, 'Model is required'),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, 'User prompt is required'),
    images: z.array(z.string()).optional(),
});

export type LLMRequestSchema = z.infer<typeof llmRequestSchema>;

// Schema for workflow save/load
export const workflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    nodes: z.array(z.object({
        id: z.string(),
        type: z.enum(['text', 'image', 'llm']),
        position: z.object({
            x: z.number(),
            y: z.number(),
        }),
        data: z.record(z.string(), z.any()),
    })),
    edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        sourceHandle: z.string().optional(),
        targetHandle: z.string().optional(),
    })),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type WorkflowSchema = z.infer<typeof workflowSchema>;
