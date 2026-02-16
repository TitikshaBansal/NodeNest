'use client';

import Image from "next/image";
import { useCallback } from "react";
import {
    ReactFlow,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Custom nodes for React Flow
const Card3D = () => (
    <div className="bg-[#d8dce6] rounded-2xl p-4 w-50 shadow-lg cursor-grab active:cursor-grabbing">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
                3D
            </span>
            <span className="text-[10px] text-[#888]">RODIN 2.0</span>
        </div>
        <div className="h-60 rounded-xl overflow-hidden bg-[#e8e5e0]">
            <Image
                src="/images/681cd65ba87c69df161752e5_3d_card.avif"
                alt="3D"
                width={180}
                height={230}
                className="object-contain w-full h-full"
                draggable={false}
            />
        </div>
        <Handle
            type="source"
            position={Position.Right}
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
    </div>
);

const ColorRefCard = () => (
    <div className="rounded-2xl p-4 w-50 shadow-lg bg-[#4a7aa8] cursor-grab active:cursor-grabbing">
        <div className="mb-2">
            <span className="text-[10px] text-white uppercase tracking-wide font-medium">
                Color Reference
            </span>
        </div>
        <div className="h-30 rounded-xl overflow-hidden">
            <Image
                src="/images/68349defe03a701656079aac_Color-diff_hero_mobile.avif"
                alt="Color"
                width={180}
                height={110}
                className="object-contain w-full h-full"
                draggable={false}
            />
        </div>
        <Handle
            type="source"
            position={Position.Right}
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
    </div>
);

const StableDiffusionCard = () => (
    <div className="bg-[#e8e4dc] rounded-2xl p-4 w-85 shadow-lg cursor-grab active:cursor-grabbing">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
                Image
            </span>
            <span className="text-[10px] text-[#888]">STABLE DIFFUSION</span>
        </div>
        <div className="h-120 rounded-xl overflow-hidden">
            <Image
                src="/images/681cd7cbc22419b32bb9d8d8_hcard - STABLE DIFFUSION.avif"
                alt="Stable Diffusion"
                width={320}
                height={470}
                className="object-contain w-full h-full"
                draggable={false}
            />
        </div>
        <Handle
            type="target"
            position={Position.Left}
            id="left-top"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[30%]!"
        />
        <Handle
            type="target"
            position={Position.Left}
            id="left-bottom"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[70%]!"
        />
        <Handle
            type="source"
            position={Position.Right}
            id="right-top"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[30%]!"
        />
        <Handle
            type="source"
            position={Position.Right}
            id="right-bottom"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[70%]!"
        />
    </div>
);

const TextCard = () => (
    <div className="bg-white rounded-2xl p-5 w-47.5 shadow-lg border border-[#e8e8e0] cursor-grab active:cursor-grabbing">
        <div className="mb-3">
            <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
                Text
            </span>
        </div>
        <p className="text-[10px] text-[#444] leading-relaxed">
            A Great-Tailed Grackle bird is flying from the background and settling on
            the model&apos;s shoulder slowly and barely moves. The model looks at the
            camera, then bird flies away. cinematic.
        </p>
        <Handle
            type="target"
            position={Position.Left}
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
        <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
    </div>
);

const FluxCard = () => (
    <div className="bg-[#f0ede4] rounded-2xl p-4 w-55 shadow-lg border border-[#e8e5dc] cursor-grab active:cursor-grabbing">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
                Image
            </span>
            <span className="text-[10px] text-[#888]">FLUX PRO 1.1</span>
        </div>
        <div className="h-50 rounded-xl overflow-hidden">
            <Image
                src="/images/6837510acbe777269734b387_bird_desktop.avif"
                alt="Flux Pro Bird"
                width={200}
                height={190}
                className="object-cover w-full h-full"
                draggable={false}
            />
        </div>
        <Handle
            type="target"
            position={Position.Top}
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
        <Handle
            type="source"
            position={Position.Right}
            className="bg-[#aaa]! w-3! h-3! border-2! border-white!"
        />
    </div>
);

const VideoCard = () => (
    <div className="bg-[#f5f0e8] rounded-2xl p-4 w-85 shadow-lg cursor-grab active:cursor-grabbing">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
                Video
            </span>
            <span className="text-[10px] text-[#888]">MINIMAX VIDEO</span>
        </div>
        <div className="h-120 rounded-xl overflow-hidden">
            <Image
                src="/images/Screenshot 2025-12-21 at 18.22.57.png"
                alt="Minimax Video"
                width={320}
                height={470}
                className="object-contain w-full h-full"
                draggable={false}
            />
        </div>
        <Handle
            type="target"
            position={Position.Left}
            id="left-top"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[30%]!"
        />
        <Handle
            type="target"
            position={Position.Left}
            id="left-bottom"
            className="bg-[#aaa]! w-3! h-3! border-2! border-white! top-[70%]"
        />
    </div>
);

const nodeTypes = {
    card3d: Card3D,
    colorRef: ColorRefCard,
    stableDiffusion: StableDiffusionCard,
    textCard: TextCard,
    fluxCard: FluxCard,
    videoCard: VideoCard,
};

const initialNodes: Node[] = [
    { id: "3d", type: "card3d", position: { x: 60, y: 360 }, data: {} },
    { id: "color", type: "colorRef", position: { x: 60, y: 660 }, data: {} },
    {
        id: "stable",
        type: "stableDiffusion",
        position: { x: 320, y: 330 },
        data: {},
    },
    { id: "text", type: "textCard", position: { x: 720, y: 360 }, data: {} },
    { id: "flux", type: "fluxCard", position: { x: 720, y: 580 }, data: {} },
    { id: "video", type: "videoCard", position: { x: 1000, y: 330 }, data: {} },
];

const initialEdges: Edge[] = [
    {
        id: "e1",
        source: "3d",
        target: "stable",
        targetHandle: "left-top",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
    {
        id: "e2",
        source: "color",
        target: "stable",
        targetHandle: "left-bottom",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
    {
        id: "e3",
        source: "stable",
        sourceHandle: "right-top",
        target: "text",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
    {
        id: "e4",
        source: "stable",
        sourceHandle: "right-bottom",
        target: "flux",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
    {
        id: "e5",
        source: "text",
        sourceHandle: "right",
        target: "video",
        targetHandle: "left-top",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
    {
        id: "e6",
        source: "flux",
        target: "video",
        targetHandle: "left-bottom",
        type: "default",
        style: { stroke: "#bbb", strokeWidth: 1.5 },
        animated: false,
    },
];

export default function HeroFlow() {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges] = useEdgesState(initialEdges);

    // Custom handler to clamp node positions within bounds
    const handleNodesChange = useCallback(
        (changes: any) => {
            const clampedChanges = changes.map((change: any) => {
                if (change.type === "position" && change.position) {
                    return {
                        ...change,
                        position: {
                            x: Math.max(0, Math.min(1300, change.position.x)),
                            y: Math.max(0, Math.min(700, change.position.y)),
                        },
                    };
                }
                return change;
            });
            onNodesChange(clampedChanges);
        },
        [onNodesChange]
    );

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
                type: "default",
                style: { stroke: "#bbb", strokeWidth: 1.5 },
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
            minZoom={1}
            maxZoom={1}
            autoPanOnNodeDrag={false}
        />
    );
}
