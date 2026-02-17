import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Shared LLM execution logic.
 * Called directly by workflowExecutor (server-to-server, no auth needed)
 * and also by the single-node-execute route (for manual node execution).
 */
export async function executeLLMNode(inputs: {
  userPrompt: string;
  systemPrompt?: string;
  images?: string[];
}): Promise<{ success: boolean; output?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("No Gemini API key configured (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const { userPrompt, systemPrompt, images = [] } = inputs;

  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[LLM] Trying model: ${modelName}`);

      const geminiModel = genAI.getGenerativeModel({ model: modelName });

      const parts: any[] = [];

      // Handle images
      for (const imageInput of images) {
        if (!imageInput) continue;

        if (imageInput.startsWith("data:")) {
          // data URL: data:image/jpeg;base64,....
          const base64 = imageInput.split(",")[1];
          const mimeType = imageInput.split(";")[0].split(":")[1] || "image/jpeg";
          parts.push({ inlineData: { mimeType, data: base64 } });
        } else if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
          // Fetch remote image and convert to base64
          try {
            const imgRes = await fetch(imageInput);
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            parts.push({ inlineData: { mimeType, data: base64 } });
          } catch (imgError) {
            console.warn(`[LLM] Failed to fetch image: ${imageInput}`, imgError);
          }
        } else if (imageInput.length > 100) {
          // Raw base64
          parts.push({ inlineData: { mimeType: "image/jpeg", data: imageInput } });
        }
      }

      // Add text prompt
      parts.push({ text: userPrompt });

      const response = await geminiModel.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
        ],
        ...(systemPrompt && { systemInstruction: systemPrompt }),
      });

      const text = response.response.text();
      console.log(`[LLM] Success with ${modelName}, output length: ${text.length}`);

      return { success: true, output: text };
    } catch (err: any) {
      console.warn(`[LLM] Model ${modelName} failed:`, err.message);
      lastError = err;
      continue;
    }
  }

  return {
    success: false,
    error: `All Gemini models failed. Last error: ${lastError?.message || "Unknown"}`,
  };
}