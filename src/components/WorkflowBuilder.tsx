'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useParams, useRouter } from 'next/navigation';
import { Play } from "lucide-react";
import Sidebar from '@/components/Sidebar';
import Canvas from '@/components/Canvas';
import HistoryPanel from '@/components/HistoryPanel';
import { useWorkflowStore } from '@/store/workflowStore';

function WorkflowBuilderInner() {
    const canvasWrapper = useRef<HTMLDivElement>(null);
    const params = useParams();
    const router = useRouter();
    const workflowId = params.id as string;
    const { addNode, workflowId: storeWorkflowId } = useWorkflowStore();
    const { screenToFlowPosition } = useReactFlow();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const onDragStart = useCallback((event: React.DragEvent, nodeType: 'text' | 'image' | 'video' | 'llm' | 'crop' | 'extractFrame') => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow') as 'text' | 'image' | 'video' | 'llm' | 'crop' | 'extractFrame';
            if (!type) return;

            // Use React Flow's screenToFlowPosition for accurate positioning
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // No offset - place node exactly where cursor is
            addNode(type, position);
        },
        [addNode, screenToFlowPosition]
    );

    const handleExecuteWorkflow = useCallback(async () => {
        if (!workflowId || isExecuting) return;

        setIsExecuting(true);
        try {
            const response = await fetch(`/api/workflows/${workflowId}/execute`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                // Refresh history panel if open
                if (isHistoryOpen) {
                    // History panel will auto-refresh
                }
            } else {
                const error = await response.json();
                alert(`Execution failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to execute workflow:', error);
            alert('Failed to execute workflow');
        } finally {
            setIsExecuting(false);
        }
    }, [workflowId, isExecuting, isHistoryOpen]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
            {/* Canvas - takes full screen */}
            <div ref={canvasWrapper} className="absolute inset-0">
                <Canvas onDragOver={onDragOver} onDrop={onDrop} />
            </div>

            {/* Sidebar - overlays on top of canvas */}
            <div className="absolute left-0 top-0 h-full z-50 pointer-events-none">
                <div className="pointer-events-auto h-full">
                    <Sidebar 
                        onDragStart={onDragStart}
                        onExecute={handleExecuteWorkflow}
                        isExecuting={isExecuting}
                        onHistoryClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    />
                </div>
            </div>

            {/* History Panel - right sidebar */}
            {workflowId && (
                <HistoryPanel
                    workflowId={workflowId}
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />
            )}

            {/* Execute Button - floating */}
            {workflowId && (
                <div className="absolute bottom-6 right-6 z-50">
                    <button
                        onClick={handleExecuteWorkflow}
                        disabled={isExecuting}
                        className="flex items-center gap-2 px-4 py-3 bg-[#e5c100] text-black font-medium rounded-lg hover:bg-[#d4b100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isExecuting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Executing...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                <span>Run Workflow</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function WorkflowBuilder() {
    return (
        <ReactFlowProvider>
            <WorkflowBuilderInner />
        </ReactFlowProvider>
    );
}
