import { z } from "zod";
import { detectCycles } from "./dag";

// Workflow validation schema
const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "video", "llm", "cropImage", "extractFrame", "crop"]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.any()),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ValidatedWorkflow = z.infer<typeof WorkflowSchema>;

/**
 * Validate workflow JSON structure
 */
export function validateWorkflowStructure(json: string): {
  valid: boolean;
  workflow?: ValidatedWorkflow;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json);
    const result = WorkflowSchema.safeParse(parsed);

    if (!result.success) {
      return {
        valid: false,
        error: `Validation failed: ${result.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    return {
      valid: true,
      workflow: result.data,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}

/**
 * Validate DAG structure
 */
export function validateWorkflowDAG(workflow: ValidatedWorkflow): {
  valid: boolean;
  error?: string;
} {
  // Check for cycles
  const cycle = detectCycles(workflow.nodes, workflow.edges);
  if (cycle) {
    return {
      valid: false,
      error: `Workflow contains a cycle: ${cycle.join(" -> ")}`,
    };
  }

  // Check for invalid node references in edges
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      return {
        valid: false,
        error: `Edge references non-existent source node: ${edge.source}`,
      };
    }
    if (!nodeIds.has(edge.target)) {
      return {
        valid: false,
        error: `Edge references non-existent target node: ${edge.target}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Full workflow validation (structure + DAG)
 */
export function validateWorkflow(json: string): {
  valid: boolean;
  workflow?: ValidatedWorkflow;
  error?: string;
} {
  // First validate structure
  const structureValidation = validateWorkflowStructure(json);
  if (!structureValidation.valid) {
    return structureValidation;
  }

  // Then validate DAG
  const dagValidation = validateWorkflowDAG(structureValidation.workflow!);
  if (!dagValidation.valid) {
    return {
      valid: false,
      error: dagValidation.error,
    };
  }

  return {
    valid: true,
    workflow: structureValidation.workflow,
  };
}