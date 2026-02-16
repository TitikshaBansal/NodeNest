import { task } from "@trigger.dev/sdk";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Transloadit } from "transloadit";

const execAsync = promisify(exec);

// Helper to poll assembly status until complete
async function waitForAssembly(statusUrl: string, maxAttempts = 60): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(statusUrl);
    const status = await response.json();

    if (status.ok === "ASSEMBLY_COMPLETED") {
      return status;
    }

    if (status.ok === "ASSEMBLY_CANCELED" || status.ok === "ASSEMBLY_FAILED") {
      throw new Error(`Assembly failed: ${status.error || status.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Assembly timed out");
}

interface CropPayload {
  nodeId: string;
  workflowRunId: string;
  inputs: {
    imageUrl: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    xPercent?: number;
    yPercent?: number;
    widthPercent?: number;
    heightPercent?: number;
  };
}

export const cropImage = task({
  id: "crop-image",
  retry: {
    maxAttempts: 2,
  },

  run: async (payload: CropPayload) => {
    const { nodeId, workflowRunId, inputs } = payload;

    const {
      imageUrl,
      x,
      y,
      width,
      height,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
    } = inputs;

    const startTime = Date.now();
    let tempDir: string | null = null;

    try {
      const transloadit = new Transloadit({
        authKey: process.env.TRANSLOADIT_AUTH_KEY!,
        authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
      });

      // Create temp directory
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crop-"));
      const tempInputPath = path.join(tempDir, "input.jpg");
      const tempOutputPath = path.join(tempDir, "output.jpg");

      // Download image
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      await fs.writeFile(tempInputPath, Buffer.from(imageBuffer));

      // Get dimensions
      const probeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${tempInputPath}"`;
      const probeOutput = await execAsync(probeCommand);
      const probeData = JSON.parse(probeOutput.stdout);

      const imgWidth = probeData.streams[0].width;
      const imgHeight = probeData.streams[0].height;

      // Calculate crop values
      let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

      if (
        xPercent !== undefined ||
        yPercent !== undefined ||
        widthPercent !== undefined ||
        heightPercent !== undefined
      ) {
        cropX = Math.round(((xPercent ?? 0) / 100) * imgWidth);
        cropY = Math.round(((yPercent ?? 0) / 100) * imgHeight);
        cropWidth = Math.round(((widthPercent ?? 100) / 100) * imgWidth);
        cropHeight = Math.round(((heightPercent ?? 100) / 100) * imgHeight);
      } else {
        cropX = x ?? 0;
        cropY = y ?? 0;
        cropWidth = width ?? imgWidth;
        cropHeight = height ?? imgHeight;
      }

      // Crop via FFmpeg
      const ffmpegCommand = `ffmpeg -i "${tempInputPath}" -filter:v "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}" "${tempOutputPath}" -y`;
      await execAsync(ffmpegCommand);

      // Upload cropped image
      const assembly = await transloadit.createAssembly({
        files: {
          image: tempOutputPath,
        },
        params: {
          steps: {
            ":original": {
              robot: "/upload/handle",
            },
          },
        },
      });

      // Wait for upload to complete
      const uploadResult = await waitForAssembly(assembly.status_endpoint as string);

      // Get URL
      let outputUrl: string | null = null;

      if (uploadResult.results?.[":original"]?.[0]?.ssl_url) {
        outputUrl = uploadResult.results[":original"][0].ssl_url;
      } else if (uploadResult.results?.[":original"]?.[0]?.url) {
        outputUrl = uploadResult.results[":original"][0].url;
      } else if (uploadResult.uploads?.[0]?.ssl_url) {
        outputUrl = uploadResult.uploads[0].ssl_url;
      } else if (uploadResult.uploads?.[0]?.url) {
        outputUrl = uploadResult.uploads[0].url;
      }

      if (!outputUrl) {
        throw new Error("Transloadit upload failed - no URL found.");
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: outputUrl,
        duration,
        nodeId,
        workflowRunId,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Failed to crop image",
        duration,
        nodeId,
        workflowRunId,
      };
    } finally {
      // Cleanup temp directory safely
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  },
});