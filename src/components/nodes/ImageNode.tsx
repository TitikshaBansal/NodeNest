'use client';

import React, { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { ImageNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

const ImageNode = memo(({ id, data, selected }: NodeProps) => {
    const nodeData = data as ImageNodeData;
    const { updateNodeData, deleteNode } = useWorkflowStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { label: e.target.value });
    }, [id, updateNodeData]);

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    // Upload image to Transloadit
    const uploadToTransloadit = useCallback(async (base64: string) => {
        setIsUploading(true);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });

            const result = await response.json();

            if (result.success && result.url) {
                // Store Transloadit CDN URL
                // The URL will be used by Gemini task (it can fetch from URLs)
                updateNodeData(id, {
                    imageUrl: result.url,
                    imageBase64: base64, // Keep base64 as fallback
                });
            } else {
                console.error('Upload failed:', result.error);
                // Fallback to base64 if upload fails
                updateNodeData(id, {
                    imageUrl: base64,
                    imageBase64: base64,
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            // Fallback to base64 if upload fails
            updateNodeData(id, {
                imageUrl: base64,
                imageBase64: base64,
            });
        } finally {
            setIsUploading(false);
        }
    }, [id, updateNodeData]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                uploadToTransloadit(base64);
            };
            reader.readAsDataURL(file);
        }
    }, [uploadToTransloadit]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                uploadToTransloadit(base64);
            };
            reader.readAsDataURL(file);
        }
    }, [uploadToTransloadit]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const clearImage = useCallback(() => {
        updateNodeData(id, {
            imageUrl: null,
            imageBase64: null,
        });
    }, [id, updateNodeData]);

    // Display URL (prefer Transloadit URL, fallback to base64)
    const displayImageSrc = nodeData.imageUrl || nodeData.imageBase64;

    return (
        <div
            className={`bg-[#161616] border rounded-lg shadow-lg min-w-78 max-w-104 transition-all duration-200 ${selected ? 'border-[#444] shadow-white/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-[#2a2a2a] rounded">
                        <ImageIcon className="w-3 h-3 text-[#888]" />
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
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="w-full h-36 border-2 border-dashed border-[#2a2a2a] rounded flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-[#888] animate-spin" />
                        <span className="text-xs text-[#555]">Uploading...</span>
                    </div>
                ) : displayImageSrc ? (
                    <div className="relative">
                        <img
                            src={displayImageSrc}
                            alt="Uploaded"
                            className="w-full h-36 object-cover rounded border border-[#2a2a2a]"
                        />
                        <button
                            onClick={clearImage}
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
                        <span className="text-xs text-[#555]">Upload</span>
                    </div>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{ top: '50%' }}
                className="w-3! h-3! bg-[#666]! border-2! border-[#888]! transform-none!"
            />
        </div>
    );
});

ImageNode.displayName = 'ImageNode';

export default ImageNode;
