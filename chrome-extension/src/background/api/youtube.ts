/**
 * YouTube Audio Extractor
 *
 * Methods (in order of preference):
 * 1. Content script extraction (from already-loaded page)
 * 2. InnerTube API with mobile/TV clients (often return direct URLs)
 * 3. Direct fetch with signature decryption (most reliable fallback)
 */

interface YouTubeFormat {
  itag: number;
  url?: string;
  signatureCipher?: string;
  mimeType: string;
  bitrate: number;
  audioQuality?: string;
  audioSampleRate?: string;
  contentLength?: string;
}

export interface YouTubeAudioResult {
  downloadUrl: string;
  filename: string;
  title: string;
}

export interface YouTubeError {
  error: string;
}

export type YouTubeResponse = YouTubeAudioResult | YouTubeError;

// ==========================================
// Signature Decryption
// ==========================================

type TransformOp =
  | { type: 'reverse' }
  | { type: 'splice'; n: number }
  | { type: 'swap'; n: number };

function escRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract the player JS URL from YouTube page HTML
 */
function findPlayerJsUrl(html: string): string | null {
  const match1 = html.match(/"jsUrl"\s*:\s*"([^"]*base\.js[^"]*)"/);
  if (match1) {
    const jsUrl = match1[1];
    return jsUrl.startsWith('http') ? jsUrl : `https://www.youtube.com${jsUrl}`;
  }
  const match2 = html.match(/\/s\/player\/[a-zA-Z0-9]+\/player_ias\.vflset\/[a-zA-Z_]+\/base\.js/);
  if (match2) {
    return `https://www.youtube.com${match2[0]}`;
  }
  return null;
}

/**
 * Parse the signature decipher operations from YouTube's player JS.
 *
 * YouTube's player contains a function that deciphers scrambled signatures
 * using a sequence of string operations (reverse, splice, swap).
 */
function parseDecipherOps(playerJs: string): TransformOp[] | null {
  // Step 1: Find the decipher function name
  const funcNamePatterns = [
    /\b[cs]\s*&&\s*[adf]\.set\([^,]+\s*,\s*encodeURIComponent\(([a-zA-Z0-9$]+)\(/,
    /\bm=([a-zA-Z0-9$]{2,})\(decodeURIComponent\(h\.s\)\)/,
    /\bc\s*&&\s*d\.set\([^,]+\s*,\s*(?:encodeURIComponent\s*\()([a-zA-Z0-9$]+)\(/,
    /\bc\s*&&\s*[a-z]\.set\([^,]+\s*,\s*([a-zA-Z0-9$]+)\(/,
    /\bc\s*&&\s*[a-z]\.set\([^,]+\s*,\s*encodeURIComponent\(([a-zA-Z0-9$]+)\(/,
    /([a-zA-Z0-9$]+)\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/,
  ];

  let funcName: string | null = null;
  for (const pattern of funcNamePatterns) {
    const match = playerJs.match(pattern);
    if (match?.[1]) {
      funcName = match[1];
      break;
    }
  }

  if (!funcName) {
    console.log('Could not find decipher function name');
    return null;
  }

  console.log('Found decipher function name:', funcName);

  // Step 2: Find the function body
  const funcBodyRegex = new RegExp(
    `${escRegExp(funcName)}\\s*=\\s*function\\(a\\)\\{a=a\\.split\\(""\\);([\\s\\S]*?)return a\\.join\\(""\\)\\}`
  );
  const funcBodyMatch = playerJs.match(funcBodyRegex);
  if (!funcBodyMatch) {
    console.log('Could not find decipher function body');
    return null;
  }
  const funcBody = funcBodyMatch[1];

  // Step 3: Find the helper object name
  const helperNameMatch = funcBody.match(/([a-zA-Z0-9$]+)\.[a-zA-Z0-9$]+\(/);
  if (!helperNameMatch) {
    console.log('Could not find helper object name');
    return null;
  }
  const helperName = helperNameMatch[1];

  // Step 4: Find and parse the helper object methods
  const helperRegex = new RegExp(
    `var\\s+${escRegExp(helperName)}\\s*=\\s*\\{([\\s\\S]*?)\\};`
  );
  const helperMatch = playerJs.match(helperRegex);
  if (!helperMatch) {
    console.log('Could not find helper object');
    return null;
  }

  const methods: Record<string, 'reverse' | 'splice' | 'swap'> = {};
  const methodRegex = /([a-zA-Z0-9$]+)\s*:\s*function\s*\([^)]*\)\s*\{([^}]+)\}/g;
  let mm;
  while ((mm = methodRegex.exec(helperMatch[1])) !== null) {
    const body = mm[2];
    if (body.includes('reverse')) methods[mm[1]] = 'reverse';
    else if (body.includes('splice')) methods[mm[1]] = 'splice';
    else methods[mm[1]] = 'swap';
  }

  // Step 5: Parse the operation sequence from the function body
  const ops: TransformOp[] = [];
  const opRegex = new RegExp(
    `${escRegExp(helperName)}\\.([a-zA-Z0-9$]+)\\(a(?:,(\\d+))?\\)`,
    'g'
  );
  let om;
  while ((om = opRegex.exec(funcBody)) !== null) {
    const methodType = methods[om[1]];
    if (!methodType) continue;
    const param = om[2] ? parseInt(om[2]) : 0;
    switch (methodType) {
      case 'reverse': ops.push({ type: 'reverse' }); break;
      case 'splice': ops.push({ type: 'splice', n: param }); break;
      case 'swap': ops.push({ type: 'swap', n: param }); break;
    }
  }

  console.log(`Parsed ${ops.length} decipher operations`);
  return ops.length > 0 ? ops : null;
}

/**
 * Apply decipher operations to a signature string
 */
function applyDecipherOps(sig: string, ops: TransformOp[]): string {
  const a = sig.split('');
  for (const op of ops) {
    switch (op.type) {
      case 'reverse': a.reverse(); break;
      case 'splice': a.splice(0, op.n); break;
      case 'swap': {
        const pos = op.n % a.length;
        const tmp = a[0];
        a[0] = a[pos];
        a[pos] = tmp;
        break;
      }
    }
  }
  return a.join('');
}

/**
 * Decrypt a signatureCipher into a direct URL
 */
function decryptCipher(cipher: string, ops: TransformOp[]): string | null {
  const params = new URLSearchParams(cipher);
  const s = params.get('s');
  const sp = params.get('sp') || 'sig';
  const url = params.get('url');

  if (!s || !url) return null;

  const decrypted = applyDecipherOps(s, ops);
  return `${url}&${sp}=${encodeURIComponent(decrypted)}`;
}

/**
 * Fetch and parse decipher operations from a player JS URL
 */
async function fetchDecipherOps(playerJsUrl: string): Promise<TransformOp[] | null> {
  try {
    const response = await fetch(playerJsUrl);
    if (!response.ok) return null;
    const playerJs = await response.text();
    return parseDecipherOps(playerJs);
  } catch {
    return null;
  }
}

// ==========================================
// Format Selection & Processing
// ==========================================

/**
 * Get the best audio format from available formats.
 * If decipherOps provided, can also decrypt signatureCipher formats.
 */
function getBestAudioFormat(
  formats: YouTubeFormat[],
  decipherOps?: TransformOp[] | null
): YouTubeFormat | null {
  const audioFormats = formats.filter(f => f.mimeType?.includes('audio'));
  if (audioFormats.length === 0) return null;

  // Prefer direct URL formats
  const directFormats = audioFormats.filter(f => f.url);
  if (directFormats.length > 0) {
    directFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return directFormats[0];
  }

  // If we have decipher ops, decrypt signatureCipher formats
  if (decipherOps) {
    for (const format of audioFormats) {
      if (format.signatureCipher) {
        const url = decryptCipher(format.signatureCipher, decipherOps);
        if (url) {
          format.url = url;
          format.signatureCipher = undefined;
        }
      }
    }

    const decryptedFormats = audioFormats.filter(f => f.url);
    if (decryptedFormats.length > 0) {
      decryptedFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      return decryptedFormats[0];
    }
  }

  return null;
}

// Internal sentinel for "has cipher formats but no decipher ops"
const NEEDS_DECRYPTION = '__NEEDS_DECRYPTION__';

function processPlayerResponse(
  playerResponse: any,
  decipherOps?: TransformOp[] | null
): YouTubeResponse {
  if (playerResponse.playabilityStatus?.status !== 'OK') {
    const reason = playerResponse.playabilityStatus?.reason || 'Video unavailable';
    return { error: reason };
  }

  const streamingData = playerResponse.streamingData;
  if (!streamingData) {
    return { error: 'No streaming data available' };
  }

  const allFormats: YouTubeFormat[] = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || [])
  ];

  const audioFormat = getBestAudioFormat(allFormats, decipherOps);

  if (!audioFormat || !audioFormat.url) {
    const hasCipherFormats = allFormats.some(
      f => f.mimeType?.includes('audio') && f.signatureCipher
    );
    if (hasCipherFormats && !decipherOps) {
      return { error: NEEDS_DECRYPTION };
    }
    return { error: 'No audio stream found in the video data' };
  }

  const videoDetails = playerResponse.videoDetails || {};
  const title = videoDetails.title || 'youtube_audio';
  const author = videoDetails.author || 'Unknown';
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return {
    downloadUrl: audioFormat.url,
    filename: `${safeTitle}.mp3`,
    title: `${title} - ${author}`
  };
}

// ==========================================
// Extraction Methods
// ==========================================

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Method 1: Content script extraction (preferred when on YouTube page)
 */
async function extractViaContentScript(videoId: string): Promise<YouTubeResponse | null> {
  try {
    const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/*' });
    const matchingTab = tabs.find(tab =>
      tab.url?.includes(videoId) && tab.id !== undefined
    );

    if (!matchingTab?.id) return null;

    const response = await chrome.tabs.sendMessage(matchingTab.id, {
      type: 'EXTRACT_YOUTUBE_DATA'
    });

    if (!response?.playerData) return null;

    // Try without decryption first
    const result = processPlayerResponse(response.playerData);
    if ('downloadUrl' in result) return result;

    // If needs decryption and we have the player JS URL from the content script
    if ('error' in result && result.error === NEEDS_DECRYPTION && response.playerJsUrl) {
      console.log('Content script data needs decryption, fetching player JS...');
      const ops = await fetchDecipherOps(response.playerJsUrl);
      if (ops) {
        const decrypted = processPlayerResponse(response.playerData, ops);
        if ('downloadUrl' in decrypted) return decrypted;
      }
    }

    // Return error but don't block other methods
    return 'error' in result && result.error === NEEDS_DECRYPTION ? null : result;
  } catch {
    return null;
  }
}

/**
 * Method 2: InnerTube API with alternative clients.
 * Mobile/TV clients often return direct URLs without signature cipher.
 */
async function extractViaInnerTubeApi(videoId: string): Promise<YouTubeResponse> {
  const clients = [
    {
      clientName: 'ANDROID_TESTSUITE',
      clientVersion: '1.9',
      androidSdkVersion: 30,
      userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
    },
    {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientVersion: '2.0',
      userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/5.0 Chrome/51.0.2704.106 TV Safari/537.36',
    },
    {
      clientName: 'IOS',
      clientVersion: '19.09.3',
      userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
    },
  ];

  for (const client of clients) {
    try {
      console.log(`Trying InnerTube API with ${client.clientName}...`);

      const body: Record<string, any> = {
        videoId,
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: 'en',
            gl: 'US',
          },
        },
      };

      if ('androidSdkVersion' in client) {
        body.context.client.androidSdkVersion = client.androidSdkVersion;
      }

      const response = await fetch(
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) continue;

      const playerResponse = await response.json();
      const result = processPlayerResponse(playerResponse);

      if ('downloadUrl' in result) {
        console.log(`InnerTube API succeeded with ${client.clientName}`);
        return result;
      }
    } catch {
      continue;
    }
  }

  return { error: 'InnerTube API extraction failed for all clients' };
}

/**
 * Method 3: Direct fetch of the watch page with signature decryption fallback
 */
async function extractViaDirectFetch(videoId: string): Promise<YouTubeResponse> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const response = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!response.ok) {
    return { error: 'Failed to fetch video page' };
  }

  const html = await response.text();
  const playerResponse = extractPlayerResponseFromHtml(html);

  if (!playerResponse) {
    return { error: 'Could not extract player data. YouTube may be blocking the request. Try opening the video in a tab first.' };
  }

  // Try without decryption first
  const directResult = processPlayerResponse(playerResponse);
  if ('downloadUrl' in directResult) return directResult;

  // If we need decryption, get the player JS and parse it
  if ('error' in directResult && directResult.error === NEEDS_DECRYPTION) {
    console.log('Direct fetch needs signature decryption...');

    const playerJsUrl = findPlayerJsUrl(html);
    if (!playerJsUrl) {
      return { error: 'Could not find player JS URL for signature decryption' };
    }

    const ops = await fetchDecipherOps(playerJsUrl);
    if (!ops) {
      return { error: 'Could not parse signature decipher function from player JS' };
    }

    console.log('Decrypting signatures...');
    return processPlayerResponse(playerResponse, ops);
  }

  return directResult;
}

function extractPlayerResponseFromHtml(html: string): any {
  const patterns = [
    /var ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var|<\/script>)/,
    /var ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }
  return null;
}

// ==========================================
// Main Entry Point
// ==========================================

/**
 * Extract audio from a YouTube URL.
 * Tries multiple methods in order of reliability.
 */
export async function extractYouTubeAudio(url: string): Promise<YouTubeResponse> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { error: 'Invalid YouTube URL' };
  }

  try {
    // Method 1: Content script (best when user is on the YouTube page)
    console.log('Trying content script extraction...');
    const csResult = await extractViaContentScript(videoId);
    if (csResult && 'downloadUrl' in csResult) {
      console.log('Content script extraction succeeded');
      return csResult;
    }
    if (csResult) {
      console.log('Content script returned error:', (csResult as YouTubeError).error);
    }

    // Method 2: InnerTube API (mobile/TV clients often return direct URLs)
    console.log('Trying InnerTube API extraction...');
    const apiResult = await extractViaInnerTubeApi(videoId);
    if ('downloadUrl' in apiResult) {
      return apiResult;
    }
    console.log('InnerTube API failed:', (apiResult as YouTubeError).error);

    // Method 3: Direct fetch with signature decryption
    console.log('Falling back to direct fetch with signature decryption...');
    return await extractViaDirectFetch(videoId);
  } catch (error) {
    console.error('YouTube extraction error:', error);
    return { error: 'Failed to extract audio from YouTube' };
  }
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}
