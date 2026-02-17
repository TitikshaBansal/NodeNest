'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useParams } from 'next/navigation';
import { Play, Loader2, Save, CheckCircle } from "lucide-react";
import Sidebar from '@/components/Sidebar';
import Canvas from '@/components/Canvas';
import HistoryPanel from '@/components/HistoryPanel';
import { useWorkflowStore } from '@/store/workflowStore';

interface WorkflowBuilderProps {
    onSave?: () => Promise<void>;
    onForceSave?: () => Promise<void>;
    isSaving?: boolean;
    isDirty?: boolean;
    onExecutionStart?: () => void;
    onExecutionEnd?: () => void;
}

function WorkflowBuilderInner({
    onSave,
    onForceSave,
    isSaving,
    isDirty,
    onExecutionStart,
    onExecutionEnd,
}: WorkflowBuilderProps) {
    const canvasWrapper = useRef<HTMLDivElement>(null);
    const params = useParams();
    const workflowId = params.id as string;
    const { addNode } = useWorkflowStore();
    const { screenToFlowPosition } = useReactFlow();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionStatus, setExecutionStatus] = useState<string | null>(null);

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
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNode(type, position);
        },
        [addNode, screenToFlowPosition]
    );

    const handleExecuteWorkflow = useCallback(async () => {
        if (!workflowId || isExecuting) return;

        setIsExecuting(true);
        setExecutionStatus(null);
        onExecutionStart?.();

        try {
            // Save first (only if dirty)
            if (onForceSave) {
                setExecutionStatus('Checking for changes...');
                await onForceSave();
            }

            // Execute
            setExecutionStatus('Executing...');
            console.log('[Execute] Starting workflow execution...');

            const response = await fetch(`/api/workflows/${workflowId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setExecutionStatus('Completed! ✓');
                console.log('[Execute] Workflow completed successfully');
                setTimeout(() => setExecutionStatus(null), 3000);
                setIsHistoryOpen(true);
            } else {
                const errorMsg = data.error || 'Unknown error';
                console.error('[Execute] Failed:', errorMsg);
                alert(`Execution failed: ${errorMsg}`);
                setExecutionStatus(null);
            }
        } catch (error) {
            console.error('[Execute] Error:', error);
            alert('Failed to execute workflow. Check console for details.');
            setExecutionStatus(null);
        } finally {
            setIsExecuting(false);
            onExecutionEnd?.();
        }
    }, [workflowId, isExecuting, onForceSave, onExecutionStart, onExecutionEnd]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
            <div ref={canvasWrapper} className="absolute inset-0">
                <Canvas onDragOver={onDragOver} onDrop={onDrop} />
            </div>

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

            {workflowId && (
                <HistoryPanel
                    workflowId={workflowId}
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />
            )}

            {/* Execution status indicator */}
            {executionStatus && (
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#888]">
                    {executionStatus === 'Completed! ✓'
                        ? <CheckCircle className="w-3 h-3 text-green-400" />
                        : <Loader2 className="w-3 h-3 animate-spin" />
                    }
                    <span>{executionStatus}</span>
                </div>
            )}

            {/* Bottom-right buttons */}
            {workflowId && (
                <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2">
                    {/* Save Button */}
                    <button
                        onClick={onSave}
                        disabled={isSaving || isExecuting || !isDirty}
                        className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium rounded-lg hover:bg-[#222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                        title={isDirty ? "Save changes" : "No unsaved changes"}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>{isDirty ? 'Save' : 'Saved'}</span>
                            </>
                        )}
                    </button>

                    {/* Run Button */}
                    <button
                        onClick={handleExecuteWorkflow}
                        disabled={isExecuting || isSaving}
                        className="flex items-center gap-2 px-4 py-3 bg-[#e5c100] text-black font-medium rounded-lg hover:bg-[#d4b100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isExecuting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>{executionStatus || 'Executing...'}</span>
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

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
    return (
        <ReactFlowProvider>
            <WorkflowBuilderInner {...props} />
        </ReactFlowProvider>
    );
}