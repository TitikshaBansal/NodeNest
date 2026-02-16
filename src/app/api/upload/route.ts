import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Transloadit } from "transloadit";
import fs from "fs";
import os from "os";
import path from "path";

// Helper to poll assembly status until complete
async function waitForAssembly(statusUrl: string, maxAttempts = 60): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(statusUrl);
    const status = await response.json();

    console.log(`Assembly status (attempt ${attempt + 1}):`, status.ok);

    if (status.ok === "ASSEMBLY_COMPLETED") {
      return status;
    }

    if (status.ok === "ASSEMBLY_CANCELED" || status.ok === "ASSEMBLY_FAILED") {
      throw new Error(`Assembly failed: ${status.error || status.message}`);
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Assembly timed out after 2 minutes");
}

// Helper function to upload image to Transloadit
async function uploadImageToTransloadit(base64Image: string): Promise<string> {
  if (!process.env.TRANSLOADIT_AUTH_KEY || !process.env.TRANSLOADIT_AUTH_SECRET) {
    throw new Error("Transloadit credentials not configured");
  }

  const transloadit = new Transloadit({
    authKey: process.env.TRANSLOADIT_AUTH_KEY,
    authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
  });

  const base64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  const buffer = Buffer.from(base64, "base64");
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-image.jpg`);
  fs.writeFileSync(tempFilePath, buffer);

  try {
    console.log("Starting image upload to Transloadit...");
    
    const assembly = await transloadit.createAssembly({
      files: {
        image: tempFilePath,
      },
      params: {
        steps: {
          ":original": {
            robot: "/upload/handle",
          },
        },
      },
    });

    console.log("Assembly created, waiting for completion...");
    
    // Wait for assembly to complete
    const result = await waitForAssembly(assembly.status_endpoint as string);

    console.log("Assembly completed!");
    console.log("Results:", JSON.stringify(result.results, null, 2));

    // Get URL from completed assembly
    if (result.results?.[":original"]?.[0]?.ssl_url) {
      return result.results[":original"][0].ssl_url;
    } else if (result.results?.[":original"]?.[0]?.url) {
      return result.results[":original"][0].url;
    } else if (result.uploads?.[0]?.ssl_url) {
      return result.uploads[0].ssl_url;
    } else if (result.uploads?.[0]?.url) {
      return result.uploads[0].url;
    }

    console.error("Full result:", JSON.stringify(result, null, 2));
    throw new Error("No URL found in completed assembly");
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// Helper function to upload video to Transloadit
async function uploadVideoToTransloadit(base64Video: string, filename?: string): Promise<string> {
  if (!process.env.TRANSLOADIT_AUTH_KEY || !process.env.TRANSLOADIT_AUTH_SECRET) {
    throw new Error("Transloadit credentials not configured");
  }

  const transloadit = new Transloadit({
    authKey: process.env.TRANSLOADIT_AUTH_KEY,
    authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
  });

  const base64 = base64Video.includes(",") ? base64Video.split(",")[1] : base64Video;
  const buffer = Buffer.from(base64, "base64");
  const extension = filename?.split(".").pop() || "mp4";
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-video.${extension}`);
  fs.writeFileSync(tempFilePath, buffer);

  try {
    console.log("Starting video upload to Transloadit...");
    
    const assembly = await transloadit.createAssembly({
      files: {
        video: tempFilePath,
      },
      params: {
        steps: {
          ":original": {
            robot: "/upload/handle",
          },
        },
      },
    });

    console.log("Assembly created:", assembly.assembly_id);
    console.log("Status endpoint:", assembly.status_endpoint);
    console.log("Waiting for upload to complete...");
    
    // Wait for assembly to complete (may take 30-60 seconds for large videos)
    const result = await waitForAssembly(assembly.status_endpoint as string);

    console.log("Assembly completed!");
    console.log("Results:", JSON.stringify(result.results, null, 2));
    console.log("Uploads:", JSON.stringify(result.uploads, null, 2));

    // Get URL from completed assembly
    if (result.results?.[":original"]?.[0]?.ssl_url) {
      console.log("Found URL in results[':original'][0].ssl_url");
      return result.results[":original"][0].ssl_url;
    } else if (result.results?.[":original"]?.[0]?.url) {
      console.log("Found URL in results[':original'][0].url");
      return result.results[":original"][0].url;
    } else if (result.uploads?.[0]?.ssl_url) {
      console.log("Found URL in uploads[0].ssl_url");
      return result.uploads[0].ssl_url;
    } else if (result.uploads?.[0]?.url) {
      console.log("Found URL in uploads[0].url");
      return result.uploads[0].url;
    }

    console.error("Full result:", JSON.stringify(result, null, 2));
    throw new Error("No URL found in completed assembly");
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// POST - Upload image or video to Transloadit
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.TRANSLOADIT_AUTH_KEY || !process.env.TRANSLOADIT_AUTH_SECRET) {
      console.error("Transloadit credentials not configured");
      return NextResponse.json(
        { error: "File upload service not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, video, filename } = body;

    if (!image && !video) {
      return NextResponse.json(
        { error: "No image or video provided" },
        { status: 400 }
      );
    }

    // IMAGE UPLOAD
    if (image) {
      try {
        const imageUrl = await uploadImageToTransloadit(image);
        return NextResponse.json({ success: true, url: imageUrl });
      } catch (error: any) {
        console.error("Image upload error:", error);
        return NextResponse.json(
          { error: `Failed to upload image: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // VIDEO UPLOAD
    if (video) {
      try {
        const videoUrl = await uploadVideoToTransloadit(video, filename);
        return NextResponse.json({ success: true, url: videoUrl });
      } catch (error: any) {
        console.error("Video upload error:", error);
        return NextResponse.json(
          { error: `Failed to upload video: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid upload request" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}