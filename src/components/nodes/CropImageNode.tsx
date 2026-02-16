"use client";

import React, { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Crop, Loader2 } from "lucide-react";
import { CropImageNodeData, ImageNodeData, TextNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const CropImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CropImageNodeData;
  const { updateNodeData, deleteNode, nodes, edges } = useWorkflowStore();
  const [isRunning, setIsRunning] = useState(false);

  const connectedHandles = edges
    .filter((e) => e.target === id)
    .map((e) => e.targetHandle);

  const isImageUrlConnected = connectedHandles.includes("image_url");
  const isXPercentConnected = connectedHandles.includes("x_percent");
  const isYPercentConnected = connectedHandles.includes("y_percent");
  const isWidthPercentConnected = connectedHandles.includes("width_percent");
  const isHeightPercentConnected = connectedHandles.includes("height_percent");

  // Get connected values
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
    }
    return null;
  }, [id, nodes, edges]);

  const connectedImageUrl = isImageUrlConnected ? getConnectedValue("image_url") : null;
  const connectedXPercent = isXPercentConnected ? getConnectedValue("x_percent") : null;
  const connectedYPercent = isYPercentConnected ? getConnectedValue("y_percent") : null;
  const connectedWidthPercent = isWidthPercentConnected ? getConnectedValue("width_percent") : null;
  const connectedHeightPercent = isHeightPercentConnected ? getConnectedValue("height_percent") : null;

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleRun = useCallback(async () => {
    const imageUrl = isImageUrlConnected ? connectedImageUrl : nodeData.imageUrl;
    if (!imageUrl) {
      updateNodeData(id, { error: "Image URL is required" });
      return;
    }

    setIsRunning(true);
    updateNodeData(id, { isLoading: true, error: null });

    try {
      // Get crop parameters (use connected values or manual values)
      const xPercent = isXPercentConnected 
        ? parseFloat(connectedXPercent) || 0 
        : nodeData.xPercent || 0;
      const yPercent = isYPercentConnected 
        ? parseFloat(connectedYPercent) || 0 
        : nodeData.yPercent || 0;
      const widthPercent = isWidthPercentConnected 
        ? parseFloat(connectedWidthPercent) || 100 
        : nodeData.widthPercent || 100;
      const heightPercent = isHeightPercentConnected 
        ? parseFloat(connectedHeightPercent) || 100 
        : nodeData.heightPercent || 100;

      // Execute via workflow execution (this will be called from workflow executor)
      // For now, we'll just update the node to show it's ready
      updateNodeData(id, {
        imageUrl: imageUrl,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        isLoading: false,
      });
    } catch (error: any) {
      updateNodeData(id, {
        error: error.message || "Crop failed",
        isLoading: false,
      });
    } finally {
      setIsRunning(false);
    }
  }, [id, nodeData, isImageUrlConnected, connectedImageUrl, isXPercentConnected, connectedXPercent, isYPercentConnected, connectedYPercent, isWidthPercentConnected, connectedWidthPercent, isHeightPercentConnected, connectedHeightPercent, updateNodeData]);

  return (
    <div
      className={`bg-[#161616] border rounded-lg shadow-lg min-w-[320px] max-w-100 transition-all duration-200 ${
        nodeData.isLoading ? "node-running" : ""
      } ${selected ? "border-[#444] shadow-white/5" : "border-[#2a2a2a] hover:border-[#3a3a3a]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#2a2a2a] rounded">
            <Crop className="w-3 h-3 text-[#888]" />
          </div>
          <span className="text-white text-xs font-medium">Crop Image</span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-[#333] rounded transition-colors group"
        >
          <Trash2 className="w-3 h-3 text-[#555] group-hover:text-white" />
        </button>
      </div>

      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="image_url"
        style={{ top: "40px" }}
        className="w-3! h-3! border-2! border-[#34d399]!"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="x_percent"
        style={{ top: "70px" }}
        className="w-3! h-3! border-2! border-[#c084fc]!"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="y_percent"
        style={{ top: "100px" }}
        className="w-3! h-3! border-2! border-[#c084fc]!"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="width_percent"
        style={{ top: "130px" }}
        className="w-3! h-3! border-2! border-[#c084fc]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="height_percent"
        style={{ top: "160px" }}
        className="w-3! h-3! border-2! border-[#c084fc]!"
      />

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Image URL */}
        <div>
          <label className="text-[10px] text-[#666] mb-1 block">Image URL</label>
          <input
            type="text"
            value={isImageUrlConnected ? "[Connected]" : nodeData.imageUrl || ""}
            onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
            disabled={isImageUrlConnected}
            placeholder="Image URL or connect from node"
            className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Crop Parameters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#666] mb-1 block">X %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isXPercentConnected ? "[Connected]" : nodeData.xPercent || 0}
              onChange={(e) => updateNodeData(id, { xPercent: parseFloat(e.target.value) || 0 })}
              disabled={isXPercentConnected}
              className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#666] mb-1 block">Y %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isYPercentConnected ? "[Connected]" : nodeData.yPercent || 0}
              onChange={(e) => updateNodeData(id, { yPercent: parseFloat(e.target.value) || 0 })}
              disabled={isYPercentConnected}
              className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#666] mb-1 block">Width %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isWidthPercentConnected ? "[Connected]" : nodeData.widthPercent || 100}
              onChange={(e) => updateNodeData(id, { widthPercent: parseFloat(e.target.value) || 100 })}
              disabled={isWidthPercentConnected}
              className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#666] mb-1 block">Height %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={isHeightPercentConnected ? "[Connected]" : nodeData.heightPercent || 100}
              onChange={(e) => updateNodeData(id, { heightPercent: parseFloat(e.target.value) || 100 })}
              disabled={isHeightPercentConnected}
              className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Output */}
        {nodeData.outputUrl && (
          <div className="mt-2">
            <label className="text-[10px] text-[#666] mb-1 block">Output</label>
            <img
              src={nodeData.outputUrl}
              alt="Cropped"
              className="w-full h-24 object-contain rounded border border-[#2a2a2a]"
            />
          </div>
        )}

        {/* Error */}
        {nodeData.error && (
          <div className="text-xs text-red-400 mt-2">{nodeData.error}</div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: "50%" }}
        className="w-3! h-3! bg-[#666] border-2 border-[#888]"
      />
    </div>
  );
});

CropImageNode.displayName = "CropImageNode";

export default CropImageNode;

