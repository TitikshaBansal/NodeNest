'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    Type,
    ImageIcon,
    Video,
    Sparkles,
    Crop,
    Film,
    Save,
    FileDown,
    FileUp,
    Package,
    Plus,
    Search,
    Grid3X3,
    ArrowLeft,
    History,
    Play
} from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';

interface SidebarProps {
    onDragStart: (event: React.DragEvent, nodeType: 'text' | 'image' | 'video' | 'llm' | 'crop' | 'extractFrame') => void;
    onExecute?: () => void;
    isExecuting?: boolean;
    onHistoryClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onDragStart, onExecute, isExecuting, onHistoryClick }) => {
    const {
        workflowName,
        setWorkflowName,
        saveWorkflow,
        loadSampleWorkflow,
        exportWorkflow,
        importWorkflow,
        createNewWorkflow,
    } = useWorkflowStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [focusSearch, setFocusSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Define all available nodes (exactly 6 as per assignment)
    const allNodes = [
        { type: 'text' as const, label: 'Text', icon: Type, colSpan: false },
        { type: 'image' as const, label: 'Upload Image', icon: ImageIcon, colSpan: false },
        { type: 'video' as const, label: 'Upload Video', icon: Video, colSpan: false },
        { type: 'llm' as const, label: 'Run Any LLM', icon: Sparkles, colSpan: false },
        { type: 'crop' as const, label: 'Crop Image', icon: Crop, colSpan: false },
        { type: 'extractFrame' as const, label: 'Extract Frame', icon: Film, colSpan: false },
    ];

    // Filter nodes based on search query
    const filteredNodes = searchQuery.trim() === ''
        ? allNodes
        : allNodes.filter(node =>
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.type.toLowerCase().includes(searchQuery.toLowerCase())
        );

    useEffect(() => {
        if (focusSearch && isExpanded && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 300);
            setFocusSearch(false);
        }
    }, [focusSearch, isExpanded]);

    const handleExport = useCallback(() => {
        const json = exportWorkflow();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workflowName.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [exportWorkflow, workflowName]);

    const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = event.target?.result as string;
                    await importWorkflow(json);
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } catch (error: any) {
                    alert(`Import failed: ${error.message || 'Invalid workflow file'}`);
                }
            };
            reader.readAsText(file);
        }
    }, [importWorkflow]);

    const handleSearchClick = useCallback(() => {
        if (!isExpanded) {
            setIsExpanded(true);
            setFocusSearch(true);
        } else {
            setIsExpanded(false);
        }
    }, [isExpanded]);

    const handleQuickAccessClick = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    return (
        <div className="flex h-full">
            {/* Main sidebar column - fixed width 48px when closed */}
            <div className="w-12 h-full bg-[#141414] flex flex-col shrink-0 border-r border-[#2a2a2a]">
                {/* Logo - Link to Dashboard */}
                <Link
                    href="/dashboard"
                    className="h-12 flex items-center justify-center border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                    title="Back to Dashboard"
                >
                    <span className="text-white font-bold text-xl">N</span>
                </Link>

                {/* Icon Buttons */}
                <div className="flex flex-col items-center pt-4 gap-3">
                    <Link
                        href="/dashboard"
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-[#2a2a2a] hover:text-white rounded-lg cursor-pointer transition-all"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                    </Link>

                    <button
                        onClick={handleSearchClick}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all ${isExpanded ? 'bg-[#333] text-white' : 'text-white/80 hover:bg-[#2a2a2a] hover:text-white'
                            }`}
                        title="Search"
                    >
                        <Search className="w-4 h-4" strokeWidth={1.5} />
                    </button>

                    <button
                        onClick={handleQuickAccessClick}
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-[#2a2a2a] hover:text-white rounded-lg cursor-pointer transition-all"
                        title="Quick Access"
                    >
                        <Grid3X3 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Expandable Panel - slides in/out */}
            <div
                className="h-full bg-[#141414] flex flex-col overflow-hidden border-r border-[#2a2a2a]"
                style={{
                    width: isExpanded ? '240px' : '0px',
                    transition: 'width 0.25s ease-out',
                }}
            >
                <div className="w-60 h-full flex flex-col shrink-0">
                    {/* Workflow Name Header */}
                    <div className="h-14 flex items-center px-4 border-b border-[#2a2a2a] shrink-0">
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#222] border border-[#3a3a3a] rounded-lg text-white text-sm font-medium focus:outline-none focus:border-[#555] placeholder-[#666]"
                            placeholder="untitled"
                        />
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 border-b border-[#2a2a2a] shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666]" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#222] border border-[#3a3a3a] rounded-lg text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                            />
                        </div>
                    </div>

                    {/* Quick Access Section */}
                    <div className="p-4 flex-1 overflow-y-auto">
                        <h3 className="text-[10px] font-medium text-white/70 uppercase tracking-wide mb-3">Quick access</h3>

                        <div className="grid grid-cols-2 gap-2">
                            {filteredNodes.length > 0 ? (
                                filteredNodes.map((node) => (
                                    <div
                                        key={node.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, node.type)}
                                        className={`flex flex-col items-center justify-center p-3 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg cursor-grab active:cursor-grabbing transition-all group ${node.colSpan ? 'col-span-2' : ''
                                            }`}
                                    >
                                        <node.icon className="w-5 h-5 text-white group-hover:text-white mb-1 transition-colors" />
                                        <span className="text-[10px] text-white group-hover:text-white text-center transition-colors">{node.label}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-4 text-[#666] text-xs">
                                    No nodes found for &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>

                        {/* Tools Section */}
                        <h3 className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-5 mb-3">Tools</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleExport}
                                className="flex flex-col items-center justify-center p-3 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg transition-all group"
                            >
                                <FileDown className="w-5 h-5 text-white mb-1 transition-colors" />
                                <span className="text-[10px] text-white transition-colors">Export</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-3 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg transition-all group"
                            >
                                <FileUp className="w-5 h-5 text-white mb-1 transition-colors" />
                                <span className="text-[10px] text-white transition-colors">Import</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                            />

                            <button
                                onClick={loadSampleWorkflow}
                                className="col-span-2 flex flex-col items-center justify-center p-3 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg transition-all group"
                            >
                                <Package className="w-5 h-5 text-white mb-1 transition-colors" />
                                <span className="text-[10px] text-white text-center transition-colors">Sample Workflow</span>
                            </button>
                        </div>

                        {/* Actions Section */}
                        <h3 className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-5 mb-3">Actions</h3>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={createNewWorkflow}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg text-white hover:text-white text-[10px] transition-all"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>New</span>
                                </button>
                                <button
                                    onClick={saveWorkflow}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg text-white hover:text-white text-[10px] transition-all"
                                >
                                    <Save className="w-3 h-3" />
                                    <span>Save</span>
                                </button>
                            </div>
                            {onExecute && (
                                <button
                                    onClick={onExecute}
                                    disabled={isExecuting}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-[#e5c100] text-black hover:bg-[#d4b100] rounded-lg font-medium text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Play className="w-3 h-3" />
                                    <span>{isExecuting ? 'Running...' : 'Run Workflow'}</span>
                                </button>
                            )}
                            {onHistoryClick && (
                                <button
                                    onClick={onHistoryClick}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-transparent border border-[#3a3a3a] hover:bg-[#2a2a2a] rounded-lg text-white hover:text-white text-[10px] transition-all"
                                >
                                    <History className="w-3 h-3" />
                                    <span>History</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
