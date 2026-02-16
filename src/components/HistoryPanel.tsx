"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
// Note: prisma is server-side only, we use API routes

interface HistoryPanelProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  nodeRuns: NodeRun[];
}

interface NodeRun {
  id: string;
  nodeId: string;
  status: string;
  inputs: any;
  outputs: any;
  error: string | null;
  duration: number | null;
  startedAt: string | null;
  completedAt: string | null;
  node: {
    id: string;
    type: string;
    data: any;
  };
}

export default function HistoryPanel({ workflowId, isOpen, onClose }: HistoryPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && workflowId) {
      fetchRuns();
    }
  }, [isOpen, workflowId]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs`);
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const toggleNode = (nodeRunId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeRunId)) {
        next.delete(nodeRunId);
      } else {
        next.add(nodeRunId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-[#141414] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#2a2a2a] shrink-0">
        <h2 className="text-white font-semibold text-sm">Execution History</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-[#888] animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8 text-[#666] text-sm">
            No execution history yet
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden"
              >
                {/* Run Header */}
                <button
                  onClick={() => toggleRun(run.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedRuns.has(run.id) ? (
                      <ChevronDown className="w-4 h-4 text-[#666] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#666] shrink-0" />
                    )}
                    {getStatusIcon(run.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">
                        Run {run.id.slice(-8)}
                      </div>
                      <div className="text-[#666] text-[10px]">
                        {formatDate(run.startedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[#666] text-[10px] shrink-0 ml-2">
                    {run.nodeRuns?.length || 0} nodes
                  </div>
                </button>

                {/* Run Details */}
                {expandedRuns.has(run.id) && (
                  <div className="px-3 pb-3 space-y-2 border-t border-[#2a2a2a]">
                    <div className="pt-2 text-[10px] text-[#666] space-y-1">
                      <div>Status: <span className="text-white">{run.status}</span></div>
                      {run.completedAt && (
                        <div>Duration: <span className="text-white">
                          {formatDuration(
                            new Date(run.completedAt).getTime() -
                            new Date(run.startedAt || 0).getTime()
                          )}
                        </span></div>
                      )}
                      {run.error && (
                        <div className="text-red-400 text-xs mt-2 p-2 bg-red-500/10 rounded">
                          {run.error}
                        </div>
                      )}
                    </div>

                    {/* Node Runs */}
                    {run.nodeRuns && run.nodeRuns.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <div className="text-[10px] text-[#666] uppercase tracking-wide mb-1">
                          Node Executions
                        </div>
                        {run.nodeRuns.map((nodeRun) => (
                          <div
                            key={nodeRun.id}
                            className="bg-[#222] border border-[#3a3a3a] rounded p-2"
                          >
                            <button
                              onClick={() => toggleNode(nodeRun.id)}
                              className="w-full flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {expandedNodes.has(nodeRun.id) ? (
                                  <ChevronDown className="w-3 h-3 text-[#666]" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-[#666]" />
                                )}
                                {getStatusIcon(nodeRun.status)}
                                <span className="text-white text-[10px] truncate">
                                  {nodeRun.node?.type || "unknown"} - {nodeRun.nodeId.slice(-6)}
                                </span>
                              </div>
                              {nodeRun.duration && (
                                <span className="text-[#666] text-[10px] shrink-0">
                                  {formatDuration(nodeRun.duration)}
                                </span>
                              )}
                            </button>

                            {expandedNodes.has(nodeRun.id) && (
                              <div className="mt-2 space-y-2 text-[10px]">
                                {nodeRun.inputs && (
                                  <div>
                                    <div className="text-[#666] mb-1">Inputs:</div>
                                    <pre className="bg-[#1a1a1a] p-2 rounded text-[9px] overflow-x-auto">
                                      {JSON.stringify(nodeRun.inputs, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {nodeRun.outputs && (
                                  <div>
                                    <div className="text-[#666] mb-1">Outputs:</div>
                                    <pre className="bg-[#1a1a1a] p-2 rounded text-[9px] overflow-x-auto">
                                      {JSON.stringify(nodeRun.outputs, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {nodeRun.error && (
                                  <div className="text-red-400 p-2 bg-red-500/10 rounded">
                                    {nodeRun.error}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

