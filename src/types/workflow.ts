// Workflow type definitions

import { Node, Edge } from "@xyflow/react";

// Custom node data types with index signature for React Flow compatibility
export interface TextNodeData {
  label: string;
  content: string;
  [key: string]: unknown;
}

export interface ImageNodeData {
  label: string;
  imageUrl: string | null;
  imageBase64: string | null;
  [key: string]: unknown;
}

export interface VideoNodeData {
  label: string;
  videoUrl: string | null;
  [key: string]: unknown;
}

export interface LLMNodeData {
  label: string;
  model: string;
  systemPrompt: string;
  userMessage: string; // Changed from userPrompt to userMessage per spec
  response: string | null;
  generatedImage: string | null; // Deprecated
  isLoading: boolean;
  error: string | null;
  imageInputCount?: number; // Number of image input handles (default: 1)
  [key: string]: unknown;
}

export interface CropImageNodeData {
  label: string;
  imageUrl: string | null;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  outputUrl: string | null;
  isLoading: boolean;
  error: string | null;
  [key: string]: unknown;
}

export interface ExtractFrameNodeData {
  label: string;
  videoUrl: string | null;
  timestamp: string; // Can be seconds or percentage like "50%"
  outputUrl: string | null;
  isLoading: boolean;
  error: string | null;
  [key: string]: unknown;
}

// Union type for all node data
export type WorkflowNodeData = 
  | TextNodeData 
  | ImageNodeData 
  | VideoNodeData
  | LLMNodeData 
  | CropImageNodeData
  | ExtractFrameNodeData;

// Custom node types
export type TextNode = Node<TextNodeData, "text">;
export type ImageNode = Node<ImageNodeData, "image">;
export type VideoNode = Node<VideoNodeData, "video">;
export type LLMNode = Node<LLMNodeData, "llm">;
export type CropImageNode = Node<CropImageNodeData, "crop">;
export type ExtractFrameNode = Node<ExtractFrameNodeData, "extractFrame">;

export type WorkflowNode = TextNode | ImageNode | VideoNode | LLMNode | CropImageNode | ExtractFrameNode;

// Workflow state
export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

// API types
export interface LLMRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  images?: string[]; // base64 encoded images or URLs
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  image?: string; // Deprecated
  error?: string;
}

// Supported Gemini models with vision (text + image input)
export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro" },
] as const;

// Legacy export for backward compatibility
export const OPENAI_MODELS = GEMINI_MODELS;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["id"];
export type OpenAIModel = GeminiModel; // Alias for backward compatibility
