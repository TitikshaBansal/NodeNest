import { task } from "@trigger.dev/sdk";
import { generateGeminiContent } from "./tasks/gemini";
import { cropImage } from "./tasks/cropImage";
import { extractFrame } from "./tasks/extractFrame";

interface WorkflowNodePayload {
  nodeType: "llm" | "crop" | "extractFrame";
  nodeId: string;
  workflowRunId: string;
  inputs: any;
}

export const workflowNodeTask = task({
  id: "workflow-node-execution",

  run: async (payload: WorkflowNodePayload) => {
    const { nodeType, nodeId, workflowRunId, inputs } = payload;

    switch (nodeType) {
      case "llm":
        return await generateGeminiContent.trigger({
          nodeId,
          workflowRunId,
          inputs,
        });

      case "crop":
        return await cropImage.trigger({
          nodeId,
          workflowRunId,
          inputs,
        });

      case "extractFrame":
        return await extractFrame.trigger({
          nodeId,
          workflowRunId,
          inputs,
        });

      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  },
});
