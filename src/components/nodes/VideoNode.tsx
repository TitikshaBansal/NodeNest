"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Video, Upload, X, Loader2 } from "lucide-react";
import { VideoNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const VideoNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as VideoNodeData;
  const { updateNodeData, deleteNode, edges } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const connectedHandles = edges
    .filter((e) => e.target === id)
    .map((e) => e.targetHandle);

  const isConnected = connectedHandles.length > 0;

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { label: e.target.value });
  }, [id, updateNodeData]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  // Upload video via API route (NOT directly to Transloadit)
  const uploadToTransloadit = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          
          // Call our API route (which handles Transloadit)
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              video: base64, 
              filename: file.name 
            }),
          });

          const result = await response.json();

          if (result.success && result.url) {
            updateNodeData(id, { videoUrl: result.url });
          } else {
            console.error("Upload failed:", result.error);
            alert(`Upload failed: ${result.error}`);
          }
        } catch (error) {
          console.error("Upload error:", error);
          alert(`Upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error("File read error");
        alert("Failed to read file");
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsUploading(false);
    }
  }, [id, updateNodeData]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith("video/") || [".mp4", ".mov", ".webm", ".m4v"].some(ext => file.name.endsWith(ext)))) {
      uploadToTransloadit(file);
    }
  }, [uploadToTransloadit]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("video/") || [".mp4", ".mov", ".webm", ".m4v"].some(ext => file.name.endsWith(ext)))) {
      uploadToTransloadit(file);
    }
  }, [uploadToTransloadit]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearVideo = useCallback(() => {
    updateNodeData(id, { videoUrl: null });
  }, [id, updateNodeData]);

  return (
    <div
      className={`bg-[#161616] border rounded-lg shadow-lg min-w-78 max-w-104 transition-all duration-200 ${
        selected ? "border-[#444] shadow-white/5" : "border-[#2a2a2a] hover:border-[#3a3a3a]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#2a2a2a] rounded">
            <Video className="w-3 h-3 text-[#888]" />
          </div>
          <input
            type="text"
            value={nodeData.label}
            onChange={handleLabelChange}
            className="bg-transparent text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#555] rounded px-1 w-16 truncate"
          />
        </div>
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-[#333] rounded transition-colors group"
        >
          <Trash2 className="w-3 h-3 text-[#555] group-hover:text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/webm,video/m4v"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="w-full h-36 border-2 border-dashed border-[#2a2a2a] rounded flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#888] animate-spin" />
            <span className="text-xs text-[#555]">Uploading...</span>
          </div>
        ) : nodeData.videoUrl ? (
          <div className="relative">
            <video
              src={nodeData.videoUrl}
              controls
              className="w-full h-36 object-contain rounded border border-[#2a2a2a] bg-black"
            />
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-[#444] rounded transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full h-36 border-2 border-dashed border-[#2a2a2a] rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#444] hover:bg-[#1a1a1a] transition-all"
          >
            <Upload className="w-6 h-6 text-[#555]" />
            <span className="text-xs text-[#555]">Upload Video</span>
            <span className="text-[10px] text-[#444]">mp4, mov, webm, m4v</span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: "50%" }}
        className="w-3 h-3 bg-[#666] border-2 border-[#888]"
      />
    </div>
  );
});

VideoNode.displayName = "VideoNode";

export default VideoNode;