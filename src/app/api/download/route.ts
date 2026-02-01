import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const TMP_DIR = join(process.cwd(), "tmp");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const filename = req.nextUrl.searchParams.get("filename");

  if (!id || !filename) {
    return Response.json({ error: "Missing id or filename" }, { status: 400 });
  }

  // Prevent path traversal
  if (id.includes("..") || id.includes("/") || filename.includes("..") || filename.includes("/")) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const filePath = join(TMP_DIR, id, filename);

  if (!existsSync(filePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const stat = statSync(filePath);
  const nodeStream = createReadStream(filePath);

  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
