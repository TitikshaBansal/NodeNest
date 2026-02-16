import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Single Node Execution Endpoint
 * Allows LLM nodes to execute directly without needing a full workflow
 * Calls Gemini API directly for fast execution
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, nodeType, inputs } = body;

    // Only LLM node is supported for single execution
    if (nodeType !== "llm") {
      return NextResponse.json(
        { error: "Only LLM nodes are supported for single execution" },
        { status: 400 }
      );
    }

    if (!inputs || !inputs.userPrompt) {
      return NextResponse.json(
        { error: "Missing required inputs: userPrompt" },
        { status: 400 }
      );
    }

    console.log(`[Single Node Execute] LLM node ${nodeId} executing...`);

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Call Gemini API directly with fallback models
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const userPrompt = inputs.userPrompt;
    const images = inputs.images || [];
    const systemPrompt = inputs.systemPrompt;
    
    // Try different model names until one works
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest", 
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    
    let lastError: any = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Single Node Execute] Trying model: ${modelName}`);
        
        const geminiModel = genAI.getGenerativeModel({ model: modelName });
        
        const parts: any[] = [];

        // Handle images
        for (const imageInput of images) {
          if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageInput,
              },
            });
          } else if (imageInput.includes(",")) {
            const base64 = imageInput.split(",")[1];
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64,
              },
            });
          }
        }

        // Add text prompt
        parts.push({ text: userPrompt });

        const generationConfig = {
          temperature: 1,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
        };

        const safetySettings = [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, 
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ];

        const response = await geminiModel.generateContent({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig,
          safetySettings,
          ...(systemPrompt && { systemInstruction: systemPrompt }),
        });

        const text = response.response.text();

        console.log(`[Single Node Execute] Success with ${modelName}, output length:`, text.length);

        return NextResponse.json({
          success: true,
          output: text,
        });
        
      } catch (modelError: any) {
        console.warn(`[Single Node Execute] Model ${modelName} failed:`, modelError.message);
        lastError = modelError;
        continue;
      }
    }
    
    // If all models failed
    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`);
    
  } catch (error: any) {
    console.error("[Single Node Execute] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute node",
      },
      { status: 500 }
    );
  }
}
