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

interface ExtractFramePayload {
  nodeId: string;
  workflowRunId: string;
  inputs: {
    videoUrl: string;
    timestamp: string | number; // seconds or "50%"
  };
}

export const extractFrame = task({
  id: "extract-frame",
  retry: {
    maxAttempts: 2,
  },

  run: async (payload: ExtractFramePayload) => {
    const { nodeId, workflowRunId, inputs } = payload;
    const { videoUrl, timestamp } = inputs;

    const startTime = Date.now();
    let tempDir: string | null = null;

    try {
      const transloadit = new Transloadit({
        authKey: process.env.TRANSLOADIT_AUTH_KEY!,
        authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
      });

      // Create temp directory
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "extract-"));
      const tempInputPath = path.join(tempDir, "input.mp4");
      const tempOutputPath = path.join(tempDir, "frame.jpg");

      // Download video
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = await videoResponse.arrayBuffer();
      await fs.writeFile(tempInputPath, Buffer.from(videoBuffer));

      // Resolve timestamp
      let timestampSeconds: number;

      if (typeof timestamp === "string" && timestamp.endsWith("%")) {
        const durationCommand =
          `ffprobe -v error -show_entries format=duration ` +
          `-of default=noprint_wrappers=1:nokey=1 "${tempInputPath}"`;

        const durationOutput = await execAsync(durationCommand);
        const videoDuration = parseFloat(durationOutput.stdout.trim());

        const percentage = parseFloat(timestamp.replace("%", ""));
        timestampSeconds = (percentage / 100) * videoDuration;
      } else {
        timestampSeconds = Number(timestamp) || 0;
      }

      // Extract frame
      const ffmpegCommand =
        `ffmpeg -i "${tempInputPath}" -ss ${timestampSeconds} ` +
        `-vframes 1 "${tempOutputPath}" -y`;

      await execAsync(ffmpegCommand);

      // Upload frame to Transloadit
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
        error: error.message || "Failed to extract frame",
        duration,
        nodeId,
        workflowRunId,
      };
    } finally {
      // Cleanup temp directory
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  },
});