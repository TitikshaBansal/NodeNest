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
    const [isDirty, setIsDirty] = useState(false); // tracks unsaved changes

    const hasLoadedRef = useRef(false);
    const loadedWorkflowIdRef = useRef<string | null>(null);
    const isExecutingRef = useRef(false);
    // Snapshot of last saved state to compare against
    const lastSavedSnapshotRef = useRef<string>("");

    const {
        workflowName,
        nodes,
        edges,
        setWorkflowId,
        setWorkflowName,
        setNodes,
        setEdges,
    } = useWorkflowStore();

    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login");
        }
    }, [isLoaded, user, router]);

    useEffect(() => {
        if (user && workflowId) {
            hasLoadedRef.current = false;
            loadedWorkflowIdRef.current = null;
            setIsLoading(true);
            setIsDirty(false);
            loadWorkflow();
        }
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
                if (data.workflow.id !== workflowId) return;

                const loadedNodes = data.workflow.nodes || [];
                const loadedEdges = data.workflow.edges || [];

                setWorkflowId(data.workflow.id);
                setWorkflowName(data.workflow.name);
                setNodes(loadedNodes);
                setEdges(loadedEdges);

                // Snapshot the loaded state so we can detect changes later
                lastSavedSnapshotRef.current = JSON.stringify({
                    name: data.workflow.name,
                    nodes: loadedNodes,
                    edges: loadedEdges,
                });

                hasLoadedRef.current = true;
                loadedWorkflowIdRef.current = data.workflow.id;
                setIsDirty(false);
            }
        } catch (error) {
            console.error("Failed to load workflow:", error);
            router.push("/dashboard");
        } finally {
            setIsLoading(false);
        }
    };

    // Track dirty state whenever nodes/edges/name change AFTER load
    useEffect(() => {
        if (!hasLoadedRef.current || !workflowId) return;

        const currentSnapshot = JSON.stringify({ name: workflowName, nodes, edges });
        const dirty = currentSnapshot !== lastSavedSnapshotRef.current;
        setIsDirty(dirty);
    }, [nodes, edges, workflowName, workflowId]);

    // Core save logic
    const performSave = useCallback(async (): Promise<void> => {
        if (!workflowId || !hasLoadedRef.current || loadedWorkflowIdRef.current !== workflowId) return;

        const sanitizedNodes = nodes.map((node) => {
            if (node.type === "llm") {
                const { isLoading, ...restData } = node.data as Record<string, unknown>;
                return { ...node, data: { ...restData, isLoading: false } };
            }
            if (node.type === "image") {
                const imageData = node.data as { imageUrl?: string; imageBase64?: string; label?: string };
                if (imageData.imageUrl?.startsWith('http')) {
                    return { ...node, data: { label: imageData.label, imageUrl: imageData.imageUrl, imageBase64: null } };
                }
                if (imageData.imageBase64) {
                    return { ...node, data: { label: imageData.label, imageUrl: imageData.imageBase64, imageBase64: imageData.imageBase64 } };
                }
            }
            return node;
        });

        console.log('[Save] Saving workflow:', workflowId);

        const res = await fetch(`/api/workflows/${workflowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: workflowName, nodes: sanitizedNodes, edges }),
        });

        if (!res.ok) throw new Error(`Save failed: ${res.status}`);

        // Update snapshot after successful save
        lastSavedSnapshotRef.current = JSON.stringify({ name: workflowName, nodes: sanitizedNodes, edges });
        setIsDirty(false);
        console.log('[Save] Saved successfully');
    }, [workflowId, workflowName, nodes, edges]);

    // Manual save - called by Save button
    const handleSave = useCallback(async () => {
        if (isSaving || isExecutingRef.current) return;
        setIsSaving(true);
        try {
            await performSave();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save workflow. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, performSave]);

    // Force save before execution - only saves if dirty
    const forceSave = useCallback(async (): Promise<void> => {
        if (!isDirty) {
            console.log('[ForceSave] No changes detected, skipping save');
            return;
        }
        console.log('[ForceSave] Changes detected, saving before execution...');
        setIsSaving(true);
        try {
            await performSave();
            // Small delay to ensure DB write is committed
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('[ForceSave] Done');
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, performSave]);

    const onExecutionStart = useCallback(() => {
        isExecutingRef.current = true;
    }, []);

    const onExecutionEnd = useCallback(() => {
        isExecutingRef.current = false;
    }, []);

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

    return (
        <WorkflowBuilder
            onSave={handleSave}
            onForceSave={forceSave}
            isSaving={isSaving}
            isDirty={isDirty}
            onExecutionStart={onExecutionStart}
            onExecutionEnd={onExecutionEnd}
        />
    );
}