import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const TMP_DIR = join(process.cwd(), "tmp");

function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  ensureTmpDir();
  const jobId = randomUUID();
  const outputDir = join(TMP_DIR, jobId);
  mkdirSync(outputDir, { recursive: true });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      // Step 1: Get video info
      send({ type: "progress", message: "Fetching video info..." });

      const infoProc = spawn("yt-dlp", [
        "--no-playlist",
        "--print", "%(title)s",
        "--print", "%(duration)s",
        url,
      ]);

      let infoOutput = "";
      let infoError = "";

      infoProc.stdout.on("data", (data: Buffer) => {
        infoOutput += data.toString();
      });

      infoProc.stderr.on("data", (data: Buffer) => {
        infoError += data.toString();
      });

      infoProc.on("close", (code) => {
        if (code !== 0) {
          send({ type: "error", message: infoError.trim() || "Failed to fetch video info. Check the URL and try again." });
          controller.close();
          return;
        }

        const lines = infoOutput.trim().split("\n");
        const title = lines[0] || "Unknown";
        const duration = parseFloat(lines[1]) || 0;

        send({
          type: "progress",
          message: `Found: ${title} (${formatDuration(duration)})`,
        });

        // Step 2: Extract audio
        send({ type: "progress", message: "Extracting audio in best quality..." });

        const outputTemplate = join(outputDir, "%(title).80s.%(ext)s");

        const dlProc = spawn("yt-dlp", [
          "--no-playlist",
          "-x",
          "--audio-format", "mp3",
          "--audio-quality", "0",
          "--embed-thumbnail",
          "--add-metadata",
          "--output", outputTemplate,
          "--newline",
          "--progress",
          url,
        ]);

        let dlError = "";
        let lastFilename = "";

        dlProc.stdout.on("data", (data: Buffer) => {
          const text = data.toString();
          const lines = text.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Parse download progress
            const pctMatch = trimmed.match(/(\d+\.?\d*)%/);
            if (pctMatch) {
              send({
                type: "progress",
                message: `Downloading... ${pctMatch[1]}%`,
              });
            }

            // Detect destination file
            const destMatch = trimmed.match(/\[ExtractAudio\] Destination: (.+)/);
            if (destMatch) {
              lastFilename = destMatch[1].split("/").pop() || "";
              send({
                type: "progress",
                message: "Converting to MP3...",
              });
            }

            const mergeMatch = trimmed.match(/Destination: (.+\.mp3)/);
            if (mergeMatch) {
              lastFilename = mergeMatch[1].split("/").pop() || "";
            }
          }
        });

        dlProc.stderr.on("data", (data: Buffer) => {
          dlError += data.toString();
        });

        dlProc.on("close", (dlCode) => {
          if (dlCode !== 0) {
            send({
              type: "error",
              message: dlError.trim() || "Audio extraction failed",
            });
            controller.close();
            return;
          }

          // Find the output file
          const fs = require("fs");
          const files: string[] = fs.readdirSync(outputDir);
          const mp3File = files.find((f: string) => f.endsWith(".mp3"));

          if (!mp3File) {
            send({
              type: "error",
              message: "Extraction completed but no MP3 file was found",
            });
            controller.close();
            return;
          }

          send({
            type: "done",
            data: {
              id: jobId,
              title: title,
              duration: formatDuration(duration),
              filename: mp3File,
            },
          });
          controller.close();
        });
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
