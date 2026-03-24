#!/usr/bin/env node

/**
 * Native Messaging Host for the MP3 Extractor extension.
 *
 * Chrome/Brave launches this script when the extension calls
 * chrome.runtime.sendNativeMessage('com.mp3.extractor', ...).
 *
 * It can:
 *   - Check if the backend is running
 *   - Start the backend if it isn't
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PORT = 3000;

// --- Native messaging protocol helpers ---

function readMessage() {
  return new Promise((resolve, reject) => {
    const headerBuf = [];
    let headerRead = 0;

    function onReadable() {
      // Read 4-byte length header
      while (headerRead < 4) {
        const byte = process.stdin.read(1);
        if (!byte) return; // wait for more data
        headerBuf.push(byte);
        headerRead++;
      }
      process.stdin.removeListener('readable', onReadable);

      const header = Buffer.concat(headerBuf);
      const len = header.readUInt32LE(0);

      // Read the JSON body
      const chunks = [];
      let bodyRead = 0;

      function onBodyReadable() {
        while (bodyRead < len) {
          const chunk = process.stdin.read(Math.min(len - bodyRead, 1024));
          if (!chunk) return;
          chunks.push(chunk);
          bodyRead += chunk.length;
        }
        process.stdin.removeListener('readable', onBodyReadable);
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(body));
      }

      process.stdin.on('readable', onBodyReadable);
      onBodyReadable();
    }

    process.stdin.on('readable', onReadable);
    onReadable();
  });
}

function writeMessage(msg) {
  const json = JSON.stringify(msg);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

// --- Backend helpers ---

function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkBackend()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startBackend() {
  const child = spawn('npm', ['start'], {
    cwd: PROJECT_DIR,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, PORT: String(PORT) },
  });
  child.unref();
  return child.pid;
}

// --- Main ---

async function main() {
  const msg = await readMessage();

  if (msg.action === 'check') {
    const running = await checkBackend();
    writeMessage({ status: running ? 'running' : 'stopped' });
  } else if (msg.action === 'start') {
    const alreadyRunning = await checkBackend();
    if (alreadyRunning) {
      writeMessage({ status: 'already_running' });
      return;
    }

    startBackend();
    const ready = await waitForBackend();
    writeMessage({ status: ready ? 'started' : 'timeout' });
  } else {
    writeMessage({ status: 'error', message: 'Unknown action' });
  }
}

main().catch((err) => {
  writeMessage({ status: 'error', message: err.message });
  process.exit(1);
});
