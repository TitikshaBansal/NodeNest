"use client";

import React, { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { MoreHorizontal, Plus, ArrowRight, Loader2, ChevronDown } from "lucide-react";
import { LLMNodeData, TextNodeData, ImageNodeData, CropImageNodeData, GEMINI_MODELS } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const LLMNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as LLMNodeData;
  const { updateNodeData, deleteNode, deleteEdgeByHandle, nodes, edges } = useWorkflowStore();
  // Use imageInputCount from node data to persist across re-renders
  const imageInputCount = (nodeData.imageInputCount as number) || 1;
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Hook to update React Flow's internal handle registry when handles change
  const updateNodeInternals = useUpdateNodeInternals();

  // Update node internals when imageInputCount changes to register new handles
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageInputCount, updateNodeInternals]);

  const connectedHandles = edges
    .filter((e) => e.target === id)
    .map((e) => e.targetHandle);

  const connectedSourceHandles = edges
    .filter((e) => e.source === id)
    .map((e) => e.sourceHandle);

  const isSystemPromptConnected = connectedHandles.includes("system_prompt");
  const isUserMessageConnected = connectedHandles.includes("user_message");

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  // Double-click on a connected handle to delete the edge
  const handleHandleDoubleClick = useCallback((e: React.MouseEvent, handleId: string, handleType: "source" | "target") => {
    const isConnected = handleType === "target"
      ? connectedHandles.includes(handleId)
      : connectedSourceHandles.includes(handleId);

    if (isConnected) {
      e.stopPropagation();
      e.preventDefault();
      deleteEdgeByHandle(id, handleId, handleType);
    }
  }, [id, connectedHandles, connectedSourceHandles, deleteEdgeByHandle]);

  const addImageInput = useCallback(() => {
    if (imageInputCount < 5) {
      updateNodeData(id, { imageInputCount: imageInputCount + 1 });
    }
  }, [imageInputCount, id, updateNodeData]);

  // Helper to convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Get connected value for a handle
  const getConnectedValue = useCallback((handleId: string): any => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === handleId);
    if (!edge) return null;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return null;

    if (sourceNode.type === "text") {
      const textData = sourceNode.data as TextNodeData;
      return textData.content;
    } else if (sourceNode.type === "image") {
      const imageData = sourceNode.data as ImageNodeData;
      return imageData.imageUrl || imageData.imageBase64;
    } else if (sourceNode.type === "crop") {
      const cropData = sourceNode.data as CropImageNodeData;
      return cropData.outputUrl;
    } else if (sourceNode.type === "extractFrame") {
      const extractData = sourceNode.data as any;
      return extractData.outputUrl;
    } else if (sourceNode.type === "llm") {
      const llmData = sourceNode.data as LLMNodeData;
      if (edge.sourceHandle === "output") {
        return llmData.response;
      }
    }
    return null;
  }, [id, nodes, edges]);

  const collectInputs = useCallback(async () => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const images: string[] = [];
    let systemPrompt = "";
    let userMessage = "";

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;
      const sourceHandle = edge.sourceHandle;

      if (targetHandle === "system_prompt") {
        if (sourceNode.type === "text") {
          const textData = sourceNode.data as TextNodeData;
          systemPrompt = textData.content || "";
        } else if (sourceNode.type === "llm" && sourceHandle === "output") {
          const llmData = sourceNode.data as LLMNodeData;
          systemPrompt = llmData.response || "";
        }
      } else if (targetHandle === "user_message") {
        if (sourceNode.type === "text") {
          const textData = sourceNode.data as TextNodeData;
          userMessage = textData.content || "";
        } else if (sourceNode.type === "llm" && sourceHandle === "output") {
          const llmData = sourceNode.data as LLMNodeData;
          userMessage = llmData.response || "";
        }
      } else if (targetHandle?.startsWith("images-")) {
        // Collect images from connected nodes
        if (sourceNode.type === "image") {
          const imageData = sourceNode.data as ImageNodeData;
          if (imageData.imageBase64) {
            images.push(imageData.imageBase64);
          } else if (imageData.imageUrl?.startsWith("http")) {
            const base64 = await urlToBase64(imageData.imageUrl);
            if (base64) images.push(base64);
          }
        } else if (sourceNode.type === "crop") {
          const cropData = sourceNode.data as CropImageNodeData;
          if (cropData.outputUrl) {
            const base64 = await urlToBase64(cropData.outputUrl);
            if (base64) images.push(base64);
          }
        } else if (sourceNode.type === "extractFrame") {
          const extractData = sourceNode.data as any;
          if (extractData.outputUrl) {
            const base64 = await urlToBase64(extractData.outputUrl);
            if (base64) images.push(base64);
          }
        }
      }
    }

    return { images, systemPrompt, userMessage };
  }, [id, nodes, edges]);

  const handleRun = useCallback(async () => {
    updateNodeData(id, { isLoading: true, error: null, response: null });

    try {
      const { images, systemPrompt: connectedSystemPrompt, userMessage: connectedUserMessage } = await collectInputs();

      // Use connected values or fallback to manual input
      const systemPrompt = isSystemPromptConnected 
        ? connectedSystemPrompt 
        : nodeData.systemPrompt || "";
      
      const userMessage = isUserMessageConnected 
        ? connectedUserMessage 
        : nodeData.userMessage || "";

      if (!userMessage) {
        updateNodeData(id, {
          error: "Please connect a user_message input or enter a user message",
          isLoading: false,
        });
        return;
      }

      // Call new single-node-execute endpoint
      const response = await fetch("/api/single-node-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          nodeType: "llm",
          inputs: {
            model: nodeData.model || "gemini-2.5-flash-latest",
            systemPrompt: systemPrompt || undefined,
            userPrompt: userMessage,
            images: images.length > 0 ? images : undefined,
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.output) {
        updateNodeData(id, {
          response: result.output,
          isLoading: false
        });
      } else if (!response.ok) {
        updateNodeData(id, { error: `HTTP ${response.status}: ${result.error || "Server error"}`, isLoading: false });
      } else {
        updateNodeData(id, { error: result.error || "Execution failed", isLoading: false });
      }
    } catch (error) {
      updateNodeData(id, {
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  }, [id, nodeData, isSystemPromptConnected, isUserMessageConnected, updateNodeData, collectInputs]);

  const showLabels = isHovered;

  return (
    <div
      className={`bg-[#2a2a2a] border rounded-xl shadow-lg transition-all duration-200 ${
        nodeData.isLoading
          ? "node-running"
          : nodeData.error
          ? "node-failed"
          : nodeData.response
          ? "node-completed"
          : ""
      } ${selected
        ? "border-[#555] shadow-white/10"
        : "border-[#3a3a3a] hover:border-[#4a4a4a]"
        }`}
      style={{ width: "380px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* System Prompt Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="system_prompt"
        style={{ top: "50px", cursor: isSystemPromptConnected ? "pointer" : "crosshair" }}
        className={`w-3 h-3 border-2 border-[#c084fc] ${isSystemPromptConnected ? "bg-[#c084fc]" : "bg-transparent"}`}
        onDoubleClick={(e) => handleHandleDoubleClick(e, "system_prompt", "target")}
      />
      {(showLabels || !isSystemPromptConnected) && (
        <div
          className="absolute text-xs text-[#c084fc]"
          style={{ left: "-75px", top: "45px" }}
        >
          system_prompt
        </div>
      )}

      {/* User Message Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="user_message"
        style={{ top: "80px", cursor: isUserMessageConnected ? "pointer" : "crosshair" }}
        className={`w-3 h-3 border-2 border-[#c084fc] ${isUserMessageConnected ? "bg-[#c084fc]" : "bg-transparent"}`}
        onDoubleClick={(e) => handleHandleDoubleClick(e, "user_message", "target")}
      />
      {(showLabels || !isUserMessageConnected) && (
        <div
          className="absolute text-xs text-[#c084fc]"
          style={{ left: "-75px", top: "75px" }}
        >
          user_message*
        </div>
      )}

      {/* Image Handles */}
      {Array.from({ length: imageInputCount }).map((_, i) => {
        const handleId = `images-${i}`;
        const isConnected = connectedHandles.includes(handleId);
        return (
          <React.Fragment key={i}>
            <Handle
              type="target"
              position={Position.Left}
              id={handleId}
              style={{ top: `${110 + i * 30}px`, cursor: isConnected ? "pointer" : "crosshair" }}
              className={`w-3 h-3 border-2 border-[#34d399] ${isConnected ? "bg-[#34d399]" : "bg-transparent"}`}
              onDoubleClick={(e) => handleHandleDoubleClick(e, handleId, "target")}
            />
            {(showLabels || !isConnected) && (
              <div
                className="absolute text-xs text-[#34d399]"
                style={{ left: "-60px", top: `${105 + i * 30}px` }}
              >
                images
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: "50%", cursor: connectedSourceHandles.includes("output") ? "pointer" : "crosshair" }}
        className={`w-3 h-3 border-2 border-[#c084fc] ${connectedSourceHandles.includes("output") ? "bg-[#c084fc]" : "bg-transparent"}`}
        onDoubleClick={(e) => handleHandleDoubleClick(e, "output", "source")}
      />
      {showLabels && (
        <div
          className="absolute text-xs text-[#c084fc]"
          style={{ right: "-35px", top: "45%" }}
        >
          output
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3a3a3a]">
        <div className="flex items-center gap-2">
          <span className="text-white text-base font-medium">Run Any LLM</span>
          <div className="relative">
            <select
              value={nodeData.model || "gemini-1.5-flash-latest"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="appearance-none bg-[#1a1a1a] border border-[#3a3a3a] text-[#aaa] text-xs rounded px-2 py-1 pr-6 focus:outline-none focus:border-[#555] cursor-pointer hover:border-[#555]"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#666] pointer-events-none" />
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-[#3a3a3a] rounded transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-[#888]" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-xl">
              <button
                onClick={() => {
                  handleDelete();
                  setShowMenu(false);
                }}
                className="px-4 py-2 text-sm text-red-400 hover:bg-[#2a2a2a]"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input Areas */}
      <div className="px-4 pt-4 space-y-3">
        {/* System Prompt */}
        <div>
          <label className="text-[10px] text-[#666] mb-1 block">System Prompt (optional)</label>
          <textarea
            value={isSystemPromptConnected ? "[Connected]" : nodeData.systemPrompt || ""}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            disabled={isSystemPromptConnected}
            placeholder="Enter system prompt or connect from Text Node..."
            className="w-full h-16 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 text-sm text-[#bbb] font-normal placeholder-[#555] resize-none focus:outline-none focus:border-[#555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* User Message */}
        <div>
          <label className="text-[10px] text-[#666] mb-1 block">User Message (required)</label>
          <textarea
            value={isUserMessageConnected ? "[Connected]" : nodeData.userMessage || ""}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            disabled={isUserMessageConnected}
            placeholder="Enter user message or connect from Text Node..."
            className="w-full h-16 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 text-sm text-[#bbb] font-normal placeholder-[#555] resize-none focus:outline-none focus:border-[#555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Response Area */}
      <div className="p-4">
        <div className="w-full min-h-35 bg-[#222] border border-[#3a3a3a] rounded-lg p-4 max-h-75 overflow-y-auto">
          {nodeData.isLoading ? (
            <div className="flex flex-col items-center justify-center h-27.5 gap-2">
              <Loader2 className="w-6 h-6 text-[#888] animate-spin" />
              <span className="text-xs text-[#666]">Generating response...</span>
            </div>
          ) : nodeData.error ? (
            <p className="text-sm text-red-400">{nodeData.error}</p>
          ) : nodeData.response ? (
            <p className="text-sm text-[#ccc] whitespace-pre-wrap">
              {nodeData.response}
            </p>
          ) : (
            <p className="text-sm text-[#666]">
              Response will appear here
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#3a3a3a]">
        <button
          onClick={addImageInput}
          disabled={imageInputCount >= 5}
          className="flex items-center gap-2 text-xs text-[#888] hover:text-white disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add image input</span>
        </button>

        <button
          onClick={handleRun}
          disabled={nodeData.isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
});

LLMNode.displayName = "LLMNode";

export default LLMNode;