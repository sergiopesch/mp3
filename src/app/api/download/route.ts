import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

const TMP_DIR = path.join(process.cwd(), "tmp");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const filename = req.nextUrl.searchParams.get("filename");

  if (!id || !filename) {
    return Response.json({ error: "Missing id or filename" }, { status: 400 });
  }

  if ([id, filename].some((value) => value.includes("..") || value.includes("/") || value.includes("\\"))) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const filePath = path.join(TMP_DIR, id, filename);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const stream = createReadStream(filePath);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
}
