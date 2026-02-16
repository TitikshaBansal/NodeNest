"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    LogOut,
    Workflow,
    Loader2,
    Trash2,
    ChevronDown,
} from "lucide-react";

interface WorkflowItem {
    id: string;
    name: string;
    updatedAt: string;
    nodes: object[];
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login");
        }
    }, [isLoaded, user, router]);

    useEffect(() => {
        if (user) {
            fetchWorkflows();
        }
    }, [user]);

    const fetchWorkflows = async () => {
        try {
            const res = await fetch("/api/workflows");
            
            // Check if response is JSON
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                // If not JSON, log the actual response for debugging
                const text = await res.text();
                console.error("Non-JSON response:", text.substring(0, 200));
                
                // If not JSON, likely redirected to login
                if (res.status === 401 || res.redirected || res.status === 302) {
                    router.push("/login");
                    return;
                }
                throw new Error(`Invalid response from server (${res.status}): ${text.substring(0, 100)}`);
            }
            
            const data = await res.json();
            
            if (!res.ok) {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                // Include error details if available
                const errorMsg = data.error || "Failed to fetch workflows";
                const details = data.details ? `\nDetails: ${data.details}` : "";
                throw new Error(`${errorMsg}${details}`);
            }
            
            if (data.workflows) {
                setWorkflows(data.workflows.map((w: any) => ({
                    id: w.id,
                    name: w.name,
                    updatedAt: w.updatedAt,
                    nodes: w.nodes || [],
                })));
            }
        } catch (error: any) {
            console.error("Failed to fetch workflows:", error);
            const errorMessage = error?.message || "Unknown error occurred";
            console.error("Error details:", error);
            // Show user-friendly error with details
            alert(`Failed to load workflows: ${errorMessage}\n\nCheck the browser console and server logs for more details.`);
        } finally {
            setIsLoading(false);
        }
    };

    const createNewWorkflow = async () => {
        setIsCreating(true);
        try {
            const res = await fetch("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Untitled Workflow" }),
            });
            
            // Check if response is JSON
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                // If not JSON, log the actual response for debugging
                const text = await res.text();
                console.error("Non-JSON response:", text.substring(0, 200));
                
                if (res.status === 401 || res.redirected || res.status === 302) {
                    router.push("/login");
                    return;
                }
                throw new Error(`Invalid response from server (${res.status}): ${text.substring(0, 100)}`);
            }
            
            const data = await res.json();
            
            if (!res.ok) {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                // Include error details if available
                const errorMsg = data.error || "Failed to create workflow";
                const details = data.details ? `\nDetails: ${data.details}` : "";
                throw new Error(`${errorMsg}${details}`);
            }
            
            if (data.workflow) {
                router.push(`/workflow/${data.workflow.id}`);
            }
        } catch (error: any) {
            console.error("Failed to create workflow:", error);
            const errorMessage = error.message || "Unknown error occurred";
            alert(`Failed to create workflow: ${errorMessage}\n\nCheck the browser console and server logs for more details.`);
        } finally {
            setIsCreating(false);
        }
    };

    const deleteWorkflow = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!confirm("Are you sure you want to delete this workflow?")) return;

        try {
            const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
            if (res.ok) {
                setWorkflows(workflows.filter((w) => w.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete workflow:", error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#1a1a1a] p-4 flex flex-col">
                {/* User Menu */}
                <div className="relative mb-6">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                    >
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded-full"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "U"}
                            </div>
                        )}
                        <span className="text-white text-sm font-medium flex-1 text-left truncate">
                            {user?.firstName || user?.emailAddresses[0]?.emailAddress || "User"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#666]" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-10">
                            <button
                                onClick={() => signOut(() => router.push("/"))}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-[#222] rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Log out
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Button */}
                <button
                    onClick={createNewWorkflow}
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-2 bg-[#e5c100] text-black py-3 rounded-lg font-medium hover:bg-[#d4b100] transition-colors disabled:opacity-50"
                >
                    {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}
                    Create New File
                </button>

                {/* Nav Items */}
                <nav className="mt-6 flex-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-white bg-[#1a1a1a] rounded-lg">
                        <Workflow className="w-4 h-4" />
                        <span className="text-sm font-medium">My Files</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <div className="max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-semibold text-white">
                            {user?.firstName || "User"}&apos;s Workspace
                        </h1>
                        <button
                            onClick={createNewWorkflow}
                            disabled={isCreating}
                            className="flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#222] transition-colors border border-[#2a2a2a]"
                        >
                            <Plus className="w-4 h-4" />
                            Create New File
                        </button>
                    </div>

                    {/* My Files */}
                    <section>
                        <h2 className="text-lg font-medium text-white mb-4">My files</h2>

                        {workflows.length === 0 ? (
                            <div className="text-center py-20">
                                <Workflow className="w-12 h-12 text-[#333] mx-auto mb-4" />
                                <p className="text-[#666] mb-4">No workflows yet</p>
                                <button
                                    onClick={createNewWorkflow}
                                    disabled={isCreating}
                                    className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create your first workflow
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {workflows.map((workflow) => (
                                    <Link
                                        key={workflow.id}
                                        href={`/workflow/${workflow.id}`}
                                        className="group bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-colors"
                                    >
                                        {/* Preview */}
                                        <div className="aspect-4/3 bg-[#111] flex items-center justify-center relative">
                                            <Workflow className="w-10 h-10 text-[#333]" />
                                            <button
                                                onClick={(e) => deleteWorkflow(workflow.id, e)}
                                                className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/50"
                                            >
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                        {/* Info */}
                                        <div className="p-4">
                                            <h3 className="text-white font-medium truncate">
                                                {workflow.name}
                                            </h3>
                                            <p className="text-[#666] text-sm mt-1">
                                                Last edited {formatDate(workflow.updatedAt)}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
