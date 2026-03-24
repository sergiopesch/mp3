import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_YT_DLP_PATH = path.join(
  process.env.HOME || "/root",
  ".local", "share", "mp3", "yt-dlp-venv", "bin", "yt-dlp"
);
const YT_DLP_BIN = process.env.YT_DLP_BIN || DEFAULT_YT_DLP_PATH;

const SPAWN_ENV = {
  ...process.env,
  PATH: `${path.dirname(YT_DLP_BIN)}:${process.env.PATH || ""}`,
};

function spawnAndCapture(args: string[]) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const child = spawn(YT_DLP_BIN, args, { env: SPAWN_ENV });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

export async function POST(req: NextRequest) {
  let rawUrl: string | undefined;
  try {
    const body = await req.json();
    rawUrl = typeof body?.url === "string" ? body.url.trim() : undefined;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!rawUrl) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    await fs.access(YT_DLP_BIN);
  } catch {
    return Response.json({ error: "yt-dlp is not installed" }, { status: 500 });
  }

  const info = await spawnAndCapture([
    "--no-playlist",
    "--print", "%(title)s",
    "--print", "%(duration)s",
    rawUrl,
  ]);

  if (info.code !== 0) {
    const detail = info.stderr.split("\n").filter(Boolean).pop() || "Failed to fetch media info";
    return Response.json({ error: detail.replace(/^ERROR:\s*/i, "") }, { status: 400 });
  }

  const [rawTitle, rawDuration] = info.stdout.trim().split(/\r?\n/);
  const title = rawTitle?.trim() || "Audio";
  const durationSeconds = Number(rawDuration?.trim() || "0");

  return Response.json({
    title,
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0,
  });
}
