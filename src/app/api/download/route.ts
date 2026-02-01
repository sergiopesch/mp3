import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const downloadUrl = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename");

  if (!downloadUrl || !filename) {
    return Response.json({ error: "Missing url or filename" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(downloadUrl);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return Response.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(downloadUrl);

    if (!response.ok || !response.body) {
      return Response.json({ error: "Download failed" }, { status: 502 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    };

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new Response(response.body, { headers });
  } catch {
    return Response.json({ error: "Download failed" }, { status: 502 });
  }
}
