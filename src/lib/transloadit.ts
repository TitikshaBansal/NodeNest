import { Transloadit } from "transloadit";
import fs from "fs";
import os from "os";
import path from "path";

if (!process.env.TRANSLOADIT_AUTH_KEY || !process.env.TRANSLOADIT_AUTH_SECRET) {
  throw new Error("Transloadit credentials are not configured.");
}

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_AUTH_KEY,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
});

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

// Upload image from base64
export async function uploadImageToTransloadit(
  base64Data: string
): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;

    const buffer = Buffer.from(base64Content, "base64");

    // Create temporary file (cross-platform safe)
    const tempFilePath = path.join(
      os.tmpdir(),
      `${Date.now()}-upload.jpg`
    );

    // Write file to temp location
    fs.writeFileSync(tempFilePath, buffer);

    try {
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

      // Wait for assembly to complete
      const result = await waitForAssembly(assembly.status_endpoint as string);

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
      throw new Error("Transloadit upload failed or no output URL found.");
    } finally {
      // Always clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error) {
    console.error("Transloadit upload error:", error);
    throw new Error("Failed to upload image to Transloadit");
  }
}

// Legacy export
export const uploadImage = uploadImageToTransloadit;

export default transloadit;