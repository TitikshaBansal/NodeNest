import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";

interface GeminiPayload {
  nodeId: string;
  workflowRunId: string;
  inputs: {
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    content?: string;
    images?: string[];
  };
}

export const generateGeminiContent = task({
  id: "generate-gemini-content",

  retry: {
    maxAttempts: 3,
  },

  run: async (payload: GeminiPayload) => {
    const { nodeId, workflowRunId, inputs } = payload;

    // Use working model names - fallback system like single-node-execute
    let model = "gemini-1.5-flash-latest";
    if (inputs.images && inputs.images.length > 0) {
      model = "gemini-1.5-pro-latest"; // Pro model handles vision better
    }
    
    const systemPrompt = inputs.systemPrompt;
    const userPrompt = inputs.userPrompt ?? inputs.content ?? "";
    const images = inputs.images ?? [];

    const startTime = Date.now();

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model });

      const parts: any[] = [];

      // ---------------------------
      // Handle images
      // ---------------------------
      for (const imageInput of images) {
        if (
          imageInput.startsWith("http://") ||
          imageInput.startsWith("https://")
        ) {
          try {
            const imageResponse = await fetch(imageInput);
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Data = Buffer.from(imageBuffer).toString("base64");

            const contentType =
              imageResponse.headers.get("content-type") || "image/jpeg";
            const mimeType = contentType.split(";")[0];

            parts.push({
              inlineData: {
                data: base64Data,
                mimeType,
              },
            });
          } catch (error) {
            console.error(
              `Failed to fetch image from ${imageInput}:`,
              error
            );
          }
        } else {
          // Base64 data URL
          const base64Data = imageInput.includes(",")
            ? imageInput.split(",")[1]
            : imageInput;

          let mimeType = "image/jpeg";
          if (imageInput.startsWith("data:image/")) {
            const mimeMatch = imageInput.match(/data:image\/([^;]+)/);
            if (mimeMatch) {
              mimeType = `image/${mimeMatch[1]}`;
            }
          }

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
        }
      }

      // ---------------------------
      // Add text prompt
      // ---------------------------
      if (systemPrompt) {
        parts.push(`${systemPrompt}\n\n${userPrompt}`);
      } else {
        parts.push(userPrompt);
      }

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts }],
      });

      const text = result.response.text();
      const duration = Date.now() - startTime;

      return {
        success: true,
        output: text,
        duration,
        nodeId,
        workflowRunId,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Failed to generate content",
        duration,
        nodeId,
        workflowRunId,
      };
    }
  },
});
