"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import WorkflowBuilder from "@/components/WorkflowBuilder";
import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowEditorPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const params = useParams();
    const workflowId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Track if workflow has been loaded from API to prevent saving empty state on refresh
    const hasLoadedRef = useRef(false);
    // Track which workflow ID was loaded to prevent cross-workflow saves
    const loadedWorkflowIdRef = useRef<string | null>(null);
    // Track when data was last loaded to prevent immediate auto-save after load
    const lastLoadTimeRef = useRef<number>(0);

    const {
        workflowName,
        nodes,
        edges,
        setWorkflowId,
        setWorkflowName,
        setNodes,
        setEdges,
        resetWorkflow,
    } = useWorkflowStore();

    // Redirect if not authenticated
    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login");
        }
    }, [isLoaded, user, router]);

    // Load workflow - reset flags when workflowId changes
    useEffect(() => {
        if (user && workflowId) {
            // Reset load tracking when switching to a different workflow
            hasLoadedRef.current = false;
            loadedWorkflowIdRef.current = null;
            setIsLoading(true);

            loadWorkflow();
        }

        // Cleanup on unmount
        return () => {
            hasLoadedRef.current = false;
            loadedWorkflowIdRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, workflowId]);

    const loadWorkflow = async () => {
        try {
            const res = await fetch(`/api/workflows/${workflowId}`);
            if (!res.ok) {
                router.push("/dashboard");
                return;
            }

            const data = await res.json();
            if (data.workflow) {
                // Verify we're still loading the same workflow (prevent race conditions)
                if (data.workflow.id !== workflowId) {
                    return;
                }

                // Debug: Log what we loaded from API
                const loadedNodes = data.workflow.nodes || [];
                const loadedEdges = data.workflow.edges || [];
                console.log('[Load] Loaded workflow:', workflowId, {
                    name: data.workflow.name,
                    nodeCount: loadedNodes.length,
                    edgeCount: loadedEdges.length,
                    imageNodes: loadedNodes.filter((n: { type: string }) => n.type === 'image').map((n: { id: string; data: { imageBase64?: string } }) => ({
                        id: n.id,
                        hasBase64: !!n.data?.imageBase64,
                    })),
                });

                setWorkflowId(data.workflow.id);
                setWorkflowName(data.workflow.name);
                setNodes(loadedNodes);
                setEdges(loadedEdges);

                // Mark as loaded so auto-save can start working
                hasLoadedRef.current = true;
                loadedWorkflowIdRef.current = data.workflow.id;
                lastLoadTimeRef.current = Date.now();
            }
        } catch (error) {
            console.error("Failed to load workflow:", error);
            router.push("/dashboard");
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-save function
    const saveWorkflow = useCallback(async () => {
        // Don't save if workflow hasn't been loaded yet (prevents saving empty state on refresh)
        // Also verify we're saving to the correct workflow (prevents cross-workflow saves)
        if (!workflowId || isSaving || !hasLoadedRef.current || loadedWorkflowIdRef.current !== workflowId) return;

        // Don't save within 3 seconds of initial load (let React Flow settle)
        const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
        if (timeSinceLoad < 3000) return;

        // Don't save if any LLM node is currently loading
        const isAnyNodeLoading = nodes.some(
            (node) => node.type === "llm" && (node.data as { isLoading?: boolean }).isLoading
        );
        if (isAnyNodeLoading) return;

        // Sanitize nodes - remove transient state and optimize image storage
        const sanitizedNodes = nodes.map((node) => {
            if (node.type === "llm") {
                const { isLoading, ...restData } = node.data as Record<string, unknown>;
                return { ...node, data: { ...restData, isLoading: false } };
            }
            if (node.type === "image") {
                const imageData = node.data as { imageUrl?: string; imageBase64?: string; label?: string };

                // If we have a Cloudinary URL (starts with http), strip base64 to reduce DB size
                if (imageData.imageUrl?.startsWith('http')) {
                    return {
                        ...node,
                        data: {
                            label: imageData.label,
                            imageUrl: imageData.imageUrl,
                            imageBase64: null
                        }
                    };
                }

                // If no Cloudinary URL but have base64, save the base64 as URL for display
                if (imageData.imageBase64) {
                    return {
                        ...node,
                        data: {
                            label: imageData.label,
                            imageUrl: imageData.imageBase64, // Store base64 as URL for display
                            imageBase64: imageData.imageBase64
                        }
                    };
                }
            }
            return node;
        });

        setIsSaving(true);
        try {
            // Debug: Log what we're about to save
            console.log('[AutoSave] Saving workflow:', workflowId, {
                name: workflowName,
                nodeCount: sanitizedNodes.length,
                edgeCount: edges.length,
                imageNodes: sanitizedNodes.filter(n => n.type === 'image').map(n => ({
                    id: n.id,
                    hasBase64: !!(n.data as { imageBase64?: string }).imageBase64,
                })),
            });

            await fetch(`/api/workflows/${workflowId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: workflowName,
                    nodes: sanitizedNodes,
                    edges,
                }),
            });
        } catch (error) {
            console.error("Failed to save workflow:", error);
        } finally {
            setIsSaving(false);
        }
    }, [workflowId, workflowName, nodes, edges, isSaving]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        if (!isLoading && workflowId) {
            const timer = setTimeout(() => {
                saveWorkflow();
            }, 2000); // Save 2 seconds after last change

            return () => clearTimeout(timer);
        }
    }, [nodes, edges, workflowName, isLoading, workflowId, saveWorkflow]);

    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-[#666] text-sm">Loading workflow...</p>
                </div>
            </div>
        );
    }

    return <WorkflowBuilder />;
}
