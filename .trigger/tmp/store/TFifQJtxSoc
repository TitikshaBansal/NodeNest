import {
  cropImage
} from "../../../../../chunk-PZ26IPOH.mjs";
import {
  extractFrame
} from "../../../../../chunk-5PWG5ZSV.mjs";
import "../../../../../chunk-OGANR6MT.mjs";
import {
  generateGeminiContent
} from "../../../../../chunk-WQZ2OESC.mjs";
import {
  task
} from "../../../../../chunk-6NN2F7ES.mjs";
import "../../../../../chunk-ZC2C5BMF.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-E5ZCWD2M.mjs";

// src/trigger/index.ts
init_esm();
var workflowNodeTask = task({
  id: "workflow-node-execution",
  run: /* @__PURE__ */ __name(async (payload) => {
    const { nodeType, nodeId, workflowRunId, inputs } = payload;
    switch (nodeType) {
      case "llm":
        return await generateGeminiContent.trigger({
          nodeId,
          workflowRunId,
          inputs
        });
      case "crop":
        return await cropImage.trigger({
          nodeId,
          workflowRunId,
          inputs
        });
      case "extractFrame":
        return await extractFrame.trigger({
          nodeId,
          workflowRunId,
          inputs
        });
      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }, "run")
});
export {
  workflowNodeTask
};
//# sourceMappingURL=index.mjs.map
