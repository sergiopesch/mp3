# MP3 Extractor

Download audio from YouTube, TikTok, Vimeo, SoundCloud, and hundreds of other sites — as MP3 files.

Runs entirely on your computer. No accounts, no third-party services, no rate limits.

Works as a **browser extension** (Chrome / Brave) or a **web app** at `localhost:3000`.

## Quick Start

### What you need first

- **Linux** (Ubuntu, Fedora, Arch, etc.)
- **Node.js 18+** — [install here](https://nodejs.org)
- **Python 3** — usually pre-installed on Linux
- **ffmpeg** — install with `sudo apt install ffmpeg`

### Step 1: Clone and set up

```bash
git clone https://github.com/sergiopesch/mp3.git
cd mp3
./setup.sh
```

This installs yt-dlp, builds the backend and extension, and starts the server.

### Step 2: Load the extension

1. Open your browser's extensions page:
   - **Chrome**: type `chrome://extensions` in the address bar
   - **Brave**: type `brave://extensions` in the address bar
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the folder: `mp3/chrome-extension/dist/`
5. Copy the **extension ID** shown under the extension name
   (looks like: `abcdefghijklmnopqrstuvwxyzabcdef`)

### Step 3: Connect the extension

Go back to your terminal and run:

```bash
./setup.sh <paste-your-extension-id>
```

### Done!

Click the MP3 Extractor icon in your browser toolbar, paste a video URL, and hit **Extract Audio**. The MP3 downloads automatically.

You can also **right-click any link** on a page and select **Extract Audio**.

The backend runs in the background — no terminal needed after setup.

## How it works

1. You give it a video URL
2. The backend (running on your machine) uses `yt-dlp` to grab the audio
3. `ffmpeg` converts it to MP3
4. The file downloads to your computer

Everything stays local. The audio is extracted on your machine and saved to your Downloads folder.

## Supported sites

Anything that [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) — including:

- YouTube
- TikTok
- Vimeo
- SoundCloud
- Twitter/X
- Instagram
- Reddit
- and hundreds more

## Web app

You can also use the web interface directly at [http://localhost:3000](http://localhost:3000) — paste a URL and download the MP3.

## Troubleshooting

**"Backend is offline" in the extension popup**

The server isn't running. Click **Start Backend** in the popup, or run:
```bash
systemctl --user start mp3
```

**"Extractor dependencies are missing"**

yt-dlp or ffmpeg isn't installed. Re-run `./setup.sh` to fix it.

**Extension not showing in toolbar**

Click the puzzle piece icon in the toolbar and pin MP3 Extractor.

**Port 3000 already in use**

Another app is using port 3000. Stop it, or edit `~/.config/systemd/user/mp3.service` to change the port.

## Uninstall

```bash
# Stop and remove the background service
systemctl --user stop mp3
systemctl --user disable mp3
rm ~/.config/systemd/user/mp3.service

# Remove native messaging
rm -f ~/.config/google-chrome/NativeMessagingHosts/com.mp3.extractor.json
rm -f ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.mp3.extractor.json
rm -f ~/.config/chromium/NativeMessagingHosts/com.mp3.extractor.json

# Remove yt-dlp
rm -rf ~/.local/share/mp3

# Remove the project
cd .. && rm -rf mp3
```

## Advanced

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `YT_DLP_BIN` | `~/.local/share/mp3/yt-dlp-venv/bin/yt-dlp` | Path to yt-dlp |
| `FFMPEG_BIN` | `/usr/bin/ffmpeg` | Path to ffmpeg |
| `EXTRACT_RETENTION_HOURS` | `24` | Hours to keep extracted files before cleanup |

### Manual backend control

```bash
systemctl --user start mp3     # Start the backend
systemctl --user stop mp3      # Stop the backend
systemctl --user status mp3    # Check if it's running
```

### Build from source

```bash
npm install && npm run build                          # Backend
cd chrome-extension && npm install && npm run build   # Extension
```
