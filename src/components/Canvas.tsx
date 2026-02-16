'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    MiniMap,
    BackgroundVariant,
    ReactFlowProvider,
    Panel,
    useReactFlow,
    reconnectEdge,
    Edge,
    Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Undo2, Redo2 } from 'lucide-react';

import { useWorkflowStore } from '@/store/workflowStore';
import TextNode from './nodes/TextNode';
import ImageNode from './nodes/ImageNode';
import VideoNode from './nodes/VideoNode';
import LLMNode from './nodes/LLMNode';
import CropImageNode from './nodes/CropImageNode';
import ExtractFrameNode from './nodes/ExtractFrameNode';

const nodeTypes = {
    text: TextNode,
    image: ImageNode,
    video: VideoNode,
    llm: LLMNode,
    crop: CropImageNode,
    extractFrame: ExtractFrameNode,
};

interface CanvasProps {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
}

const CanvasInner: React.FC<CanvasProps> = ({ onDragOver, onDrop }) => {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setEdges, deleteNode, undo, redo, canUndo, canRedo } = useWorkflowStore();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const [isLocked, setIsLocked] = useState(false);
    const edgeReconnectSuccessful = useRef(true);

    // Handle edge reconnection start
    const onReconnectStart = useCallback(() => {
        edgeReconnectSuccessful.current = false;
    }, []);

    // Handle edge reconnection
    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        edgeReconnectSuccessful.current = true;
        setEdges(reconnectEdge(oldEdge, newConnection, edges));
    }, [edges, setEdges]);

    // Handle edge reconnection end - delete if dropped on empty space
    const onReconnectEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge) => {
        if (!edgeReconnectSuccessful.current) {
            // Edge was dropped on empty space, delete it
            setEdges(edges.filter((e) => e.id !== edge.id));
        }
        edgeReconnectSuccessful.current = true;
    }, [edges, setEdges]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                // Don't delete nodes if user is typing in an input/textarea
                const target = event.target as HTMLElement;
                const isInputField = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;

                if (isInputField) {
                    return;
                }

                const selectedNodes = nodes.filter((node) => node.selected);
                selectedNodes.forEach((node) => deleteNode(node.id));
            }
        },
        [nodes, deleteNode]
    );

    return (
        <div
            ref={reactFlowWrapper}
            className="flex-1 h-full"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onReconnect={onReconnect}
                onReconnectStart={onReconnectStart}
                onReconnectEnd={onReconnectEnd}
                nodeTypes={nodeTypes}
                onDragOver={onDragOver}
                onDrop={onDrop}
                snapToGrid
                snapGrid={[15, 15]}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: '#c084fc', strokeWidth: 2 },
                }}
                nodesDraggable={!isLocked}
                nodesConnectable={!isLocked}
                elementsSelectable={!isLocked}
                panOnDrag={!isLocked}
                zoomOnScroll={!isLocked}
                className="bg-[#0a0a0a]"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={0.8}
                    color="#4a4a4a"
                />

                {/* Horizontal Toolbar at Bottom Center */}
                <Panel position="bottom-center" className="mb-6">
                    <div className="flex items-center gap-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg">
                        {/* Zoom Controls */}
                        <button
                            onClick={() => zoomIn()}
                            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => zoomOut()}
                            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => fitView({ padding: 0.2 })}
                            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                            title="Fit View"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsLocked(!isLocked)}
                            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isLocked ? 'text-white bg-[#333]' : 'text-[#888] hover:text-white hover:bg-[#2a2a2a]'
                                }`}
                            title={isLocked ? 'Unlock' : 'Lock'}
                        >
                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>

                        {/* Divider */}
                        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

                        {/* Undo/Redo */}
                        <button
                            onClick={() => undo()}
                            disabled={!canUndo()}
                            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            title="Undo"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => redo()}
                            disabled={!canRedo()}
                            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            title="Redo"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>
                </Panel>

                <MiniMap
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'text':
                                return '#555';
                            case 'image':
                                return '#666';
                            case 'llm':
                                return '#777';
                            default:
                                return '#444';
                        }
                    }}
                    maskColor="rgba(0, 0, 0, 0.8)"
                    className="bg-[#1a1a1a]! border-[#2a2a2a]! rounded-lg!"
                    pannable
                    zoomable
                />
            </ReactFlow>
        </div>
    );
};

const Canvas: React.FC<CanvasProps> = (props) => {
    return (
        <ReactFlowProvider>
            <CanvasInner {...props} />
        </ReactFlowProvider>
    );
};

export default Canvas;
