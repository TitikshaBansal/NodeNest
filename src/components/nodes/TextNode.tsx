'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, Type } from 'lucide-react';
import { TextNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

const TextNode = memo(({ id, data, selected }: NodeProps) => {
    const nodeData = data as TextNodeData;
    const { updateNodeData, deleteNode } = useWorkflowStore();

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { content: e.target.value });
    }, [id, updateNodeData]);

    const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { label: e.target.value });
    }, [id, updateNodeData]);

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    return (
        <div
            className={`bg-[#161616] border rounded-lg shadow-lg min-w-95 max-w-112.5 transition-all duration-200 ${selected ? 'border-[#444] shadow-white/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-[#2a2a2a] rounded">
                        <Type className="w-3 h-3 text-[#888]" />
                    </div>
                    <input
                        type="text"
                        value={nodeData.label}
                        onChange={handleLabelChange}
                        className="bg-transparent text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#555] rounded px-1 w-24 truncate"
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
                <textarea
                    value={nodeData.content}
                    onChange={handleContentChange}
                    placeholder="Enter text content..."
                    className="w-full h-40 bg-[#111] border border-[#2a2a2a] rounded p-2.5 text-sm text-[#bbb] font-normal placeholder-[#555] resize-none focus:outline-none focus:border-[#444] transition-colors"
                />
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{ top: '50%' }}
                className="w-3! h-3! bg-[#666] border-2 border-[#888] transform-none"
            />
        </div>
    );
});

TextNode.displayName = 'TextNode';

export default TextNode;
