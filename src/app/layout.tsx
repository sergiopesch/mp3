import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mp3 — extract audio from any video",
  description: "Paste a video URL, get the audio. Best quality, no fuss.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
