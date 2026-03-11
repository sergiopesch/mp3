import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 300;

type ProgressMessage = { type: "progress"; message: string };
type ErrorMessage = { type: "error"; message: string };
type DoneMessage = {
  type: "done";
  data: {
    id: string;
    title: string;
    duration: string;
    filename: string;
    downloadPath: string;
  };
};

type StreamMessage = ProgressMessage | ErrorMessage | DoneMessage;

const ROOT_DIR = process.cwd();
const TMP_DIR = path.join(ROOT_DIR, "tmp");
const VENV_BIN_DIR = path.join(ROOT_DIR, ".venv", "bin");
const USER_YT_DLP_BIN = path.join(process.env.HOME || "/home/sergiopesch", ".local", "share", "mp3", "yt-dlp-venv", "bin");
const DEFAULT_YT_DLP_PATH = path.join(USER_YT_DLP_BIN, "yt-dlp");
const DEFAULT_FFMPEG_PATH = "/usr/bin/ffmpeg";
const YT_DLP_BIN = process.env.YT_DLP_BIN || DEFAULT_YT_DLP_PATH;
const FFMPEG_BIN = process.env.FFMPEG_BIN || DEFAULT_FFMPEG_PATH;
const JOB_TTL_MS = Number(process.env.EXTRACT_RETENTION_HOURS || "24") * 60 * 60 * 1000;

function send(controller: ReadableStreamDefaultController<Uint8Array>, payload: StreamMessage) {
  controller.enqueue(new TextEncoder().encode(`${JSON.stringify(payload)}\n`));
}

function formatDuration(secondsRaw: string) {
  const totalSeconds = Number(secondsRaw);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "Unknown";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function sanitizeFilename(input: string) {
  const cleaned = input
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return cleaned || "audio";
}

async function ensureBinaries() {
  await Promise.all([
    fs.access(YT_DLP_BIN),
    fs.access(FFMPEG_BIN),
  ]);
}

async function cleanupOldJobs() {
  try {
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const fullPath = path.join(TMP_DIR, entry.name);
          try {
            const stat = await fs.stat(fullPath);
            if (now - stat.mtimeMs > JOB_TTL_MS) {
              await fs.rm(fullPath, { recursive: true, force: true });
            }
          } catch {
            // Ignore cleanup failures.
          }
        })
    );
  } catch {
    // Ignore cleanup failures.
  }
}

function spawnAndCapture(args: string[]) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const child = spawn(YT_DLP_BIN, args, {
      env: {
        ...process.env,
        PATH: `${path.dirname(YT_DLP_BIN)}:${VENV_BIN_DIR}:${process.env.PATH || ""}`,
        FFMPEG_LOCATION: FFMPEG_BIN,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

export async function POST(req: NextRequest) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.trim() : undefined;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    await ensureBinaries();
  } catch {
    return Response.json(
      {
        error:
          "Extractor dependencies are missing. Ensure yt-dlp and ffmpeg are installed and configured.",
      },
      { status: 500 }
    );
  }

  await fs.mkdir(TMP_DIR, { recursive: true });
  void cleanupOldJobs();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const jobId = crypto.randomUUID();
      const jobDir = path.join(TMP_DIR, jobId);
      const outputTemplate = path.join(jobDir, "%(title).120B [%(id)s].%(ext)s");

      let extractionChild: ReturnType<typeof spawn> | null = null;
      let closed = false;
      let lastPercent = "";
      let title = "Audio";
      let duration = "Unknown";

      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      const fail = async (message: string) => {
        send(controller, { type: "error", message });
        if (extractionChild) {
          extractionChild.kill("SIGTERM");
        }
        try {
          await fs.rm(jobDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup failures.
        }
        close();
      };

      try {
        await fs.mkdir(jobDir, { recursive: true });

        send(controller, { type: "progress", message: "Checking source..." });

        const info = await spawnAndCapture([
          "--no-playlist",
          "--print",
          "%(title)s",
          "--print",
          "%(duration)s",
          url!,
        ]);

        if (info.code !== 0) {
          const detail = info.stderr.split("\n").filter(Boolean).pop() || "Failed to fetch media info";
          await fail(detail.replace(/^ERROR:\s*/i, ""));
          return;
        }

        const [rawTitle, rawDuration] = info.stdout.trim().split(/\r?\n/);
        title = rawTitle?.trim() || title;
        duration = formatDuration(rawDuration?.trim() || "");

        send(controller, {
          type: "progress",
          message: `Found: ${title}${duration !== "Unknown" ? ` (${duration})` : ""}`,
        });
        send(controller, { type: "progress", message: "Downloading and converting to MP3..." });

        extractionChild = spawn(
          YT_DLP_BIN,
          [
            "--no-playlist",
            "--extract-audio",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "--embed-metadata",
            "--embed-thumbnail",
            "--no-progress",
            "--newline",
            "--progress-template",
            "download:%(progress._percent_str)s",
            "--output",
            outputTemplate,
            url!,
          ],
          {
            env: {
              ...process.env,
              PATH: `${path.dirname(YT_DLP_BIN)}:${VENV_BIN_DIR}:${process.env.PATH || ""}`,
              FFMPEG_LOCATION: FFMPEG_BIN,
            },
          }
        );

        const child = extractionChild;

        child.stdout?.on("data", (chunk) => {
          const lines = chunk
            .toString()
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter(Boolean);

          for (const line of lines) {
            const percentMatch = line.match(/download:([0-9.]+)%/i);
            if (percentMatch) {
              const pct = `${percentMatch[1]}%`;
              if (pct !== lastPercent) {
                lastPercent = pct;
                send(controller, { type: "progress", message: `Downloading... ${pct}` });
              }
              continue;
            }

            if (line.includes("[ExtractAudio]")) {
              send(controller, { type: "progress", message: "Converting to MP3..." });
            }
          }
        });

        let stderr = "";
        child.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        child.on("error", async () => {
          await fail("Failed to start local extractor process");
        });

        child.on("close", async (code) => {
          if (closed) {
            return;
          }

          if (code !== 0) {
            const detail = stderr.split("\n").filter(Boolean).pop() || "Extraction failed";
            await fail(detail.replace(/^ERROR:\s*/i, ""));
            return;
          }

          try {
            const files = await fs.readdir(jobDir);
            const mp3File = files.find((file) => file.toLowerCase().endsWith(".mp3"));

            if (!mp3File) {
              await fail("Extraction finished but no MP3 file was produced");
              return;
            }

            const safeName = sanitizeFilename(path.parse(mp3File).name);
            const normalizedFilename = `${safeName}.mp3`;

            if (normalizedFilename !== mp3File) {
              await fs.rename(path.join(jobDir, mp3File), path.join(jobDir, normalizedFilename));
            }

            send(controller, {
              type: "done",
              data: {
                id: jobId,
                title,
                duration,
                filename: normalizedFilename,
                downloadPath: `/api/download?id=${encodeURIComponent(jobId)}&filename=${encodeURIComponent(normalizedFilename)}`,
              },
            });
            close();
          } catch {
            await fail("Extraction finished but the output file could not be prepared");
          }
        });

        req.signal.addEventListener("abort", () => {
          if (extractionChild) {
            extractionChild.kill("SIGTERM");
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Extraction failed";
        await fail(message);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
