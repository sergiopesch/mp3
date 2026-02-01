import { NextRequest } from "next/server";

const COBALT_API_URL = process.env.COBALT_API_URL || "https://api.cobalt.tools/";

export const maxDuration = 30;

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

  try {
    new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const response = await fetch(COBALT_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        downloadMode: "audio",
        audioFormat: "mp3",
        audioBitrate: "320",
      }),
    });

    if (!response.ok) {
      let errorMsg = "Processing service returned an error";
      try {
        const data = await response.json();
        if (data.error?.code) errorMsg = data.error.code;
      } catch {}
      return Response.json({ error: errorMsg }, { status: 502 });
    }

    const data = await response.json();

    if (data.status === "error") {
      return Response.json(
        { error: data.error?.code || "Failed to process this URL" },
        { status: 400 }
      );
    }

    if (data.status === "tunnel" || data.status === "redirect") {
      return Response.json({
        downloadUrl: data.url,
        filename: data.filename || "audio.mp3",
      });
    }

    if (data.status === "picker") {
      if (data.audio) {
        return Response.json({
          downloadUrl: data.audio,
          filename: data.audioFilename || "audio.mp3",
        });
      }
      const first = data.picker?.[0];
      if (first?.url) {
        return Response.json({
          downloadUrl: first.url,
          filename: "audio.mp3",
        });
      }
    }

    return Response.json(
      { error: "Could not extract audio from this URL" },
      { status: 400 }
    );
  } catch {
    return Response.json(
      { error: "Failed to connect to processing service" },
      { status: 502 }
    );
  }
}
