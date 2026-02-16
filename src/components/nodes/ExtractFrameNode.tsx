"use client";

import React, { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Film, Loader2 } from "lucide-react";
import { ExtractFrameNodeData, VideoNodeData, TextNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const ExtractFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ExtractFrameNodeData;
  const { updateNodeData, deleteNode, nodes, edges } = useWorkflowStore();
  const [isRunning, setIsRunning] = useState(false);

  const connectedHandles = edges
    .filter((e) => e.target === id)
    .map((e) => e.targetHandle);

  const isVideoUrlConnected = connectedHandles.includes("video_url");
  const isTimestampConnected = connectedHandles.includes("timestamp");

  // Get connected values
  const getConnectedValue = useCallback((handleId: string): any => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === handleId);
    if (!edge) return null;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return null;

    if (sourceNode.type === "text") {
      const textData = sourceNode.data as TextNodeData;
      return textData.content;
    } else if (sourceNode.type === "video") {
      const videoData = sourceNode.data as VideoNodeData;
      return videoData.videoUrl;
    } else if (sourceNode.type === "extractFrame") {
      const extractData = sourceNode.data as ExtractFrameNodeData;
      return extractData.outputUrl;
    }
    return null;
  }, [id, nodes, edges]);

  const connectedVideoUrl = isVideoUrlConnected ? getConnectedValue("video_url") : null;
  const connectedTimestamp = isTimestampConnected ? getConnectedValue("timestamp") : null;

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleRun = useCallback(async () => {
    const videoUrl = isVideoUrlConnected ? connectedVideoUrl : nodeData.videoUrl;
    if (!videoUrl) {
      updateNodeData(id, { error: "Video URL is required" });
      return;
    }

    setIsRunning(true);
    updateNodeData(id, { isLoading: true, error: null });

    try {
      // Get timestamp (use connected value or manual value)
      const timestamp = isTimestampConnected 
        ? connectedTimestamp || "0"
        : nodeData.timestamp || "0";

      // Execute via workflow execution (this will be called from workflow executor)
      updateNodeData(id, {
        videoUrl: videoUrl,
        timestamp: timestamp,
        isLoading: false,
      });
    } catch (error: any) {
      updateNodeData(id, {
        error: error.message || "Extract frame failed",
        isLoading: false,
      });
    } finally {
      setIsRunning(false);
    }
  }, [id, nodeData, isVideoUrlConnected, connectedVideoUrl, isTimestampConnected, connectedTimestamp, updateNodeData]);

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
            <Film className="w-3 h-3 text-[#888]" />
          </div>
          <span className="text-white text-xs font-medium">Extract Frame</span>
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
        id="video_url"
        style={{ top: "50px" }}
        className="w-3! h-3! border-2! border-[#34d399]!"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="timestamp"
        style={{ top: "80px" }}
        className="w-3! h-3! border-2! border-[#c084fc]!"
      />

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Video URL */}
        <div>
          <label className="text-[10px] text-[#666] mb-1 block">Video URL</label>
          <input
            type="text"
            value={isVideoUrlConnected ? "[Connected]" : nodeData.videoUrl || ""}
            onChange={(e) => updateNodeData(id, { videoUrl: e.target.value })}
            disabled={isVideoUrlConnected}
            placeholder="Video URL or connect from node"
            className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Timestamp */}
        <div>
          <label className="text-[10px] text-[#666] mb-1 block">Timestamp (seconds or %)</label>
          <input
            type="text"
            value={isTimestampConnected ? "[Connected]" : nodeData.timestamp || "0"}
            onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
            disabled={isTimestampConnected}
            placeholder="0 or 50%"
            className="w-full px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Output */}
        {nodeData.outputUrl && (
          <div className="mt-2">
            <label className="text-[10px] text-[#666] mb-1 block">Extracted Frame</label>
            <img
              src={nodeData.outputUrl}
              alt="Extracted Frame"
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

ExtractFrameNode.displayName = "ExtractFrameNode";

export default ExtractFrameNode;

