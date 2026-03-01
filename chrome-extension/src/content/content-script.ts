// Content script for detecting MP3 URLs and extracting YouTube data

interface MP3Detection {
  url: string;
  source: 'link' | 'audio' | 'source' | 'network';
  title?: string;
}

// Detect MP3 links in the DOM
function detectMP3Links(): MP3Detection[] {
  const mp3s: MP3Detection[] = [];

  // Find all <a> tags with .mp3 href
  const links = document.querySelectorAll('a[href*=".mp3"]');
  links.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    mp3s.push({
      url: anchor.href,
      source: 'link',
      title: anchor.textContent?.trim() || undefined
    });
  });

  // Find all <audio> tags
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    if (audio.src && audio.src.endsWith('.mp3')) {
      mp3s.push({
        url: audio.src,
        source: 'audio',
        title: audio.title || undefined
      });
    }

    // Check <source> children
    const sources = audio.querySelectorAll('source');
    sources.forEach((source) => {
      if (source.src && source.src.endsWith('.mp3')) {
        mp3s.push({
          url: source.src,
          source: 'source'
        });
      }
    });
  });

  return mp3s;
}

/**
 * Extract YouTube player data from the current page.
 * This works because the content script runs in the page context
 * where ytInitialPlayerResponse is already available.
 */
function extractYouTubePlayerData(): any | null {
  // Try to get data from the page's script tags
  const scripts = document.querySelectorAll('script');
  for (let i = 0; i < scripts.length; i++) {
    const text = scripts[i].textContent || '';

    // Try multiple patterns to find ytInitialPlayerResponse
    const patterns = [
      /var ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
      /var ytInitialPlayerResponse\s*=\s*({.+?})\s*;<\/script>/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
          continue;
        }
      }
    }
  }

  // Try accessing the global variable directly via a page script injection
  // This is needed because content scripts run in an isolated world
  try {
    const dataElement = document.getElementById('__mp3_extractor_yt_data');
    if (dataElement) {
      return JSON.parse(dataElement.textContent || '');
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Inject a script into the page to access YouTube's player data
 * from the main world (where JS globals like ytInitialPlayerResponse live).
 */
function injectYouTubeDataExtractor(): void {
  if (!window.location.hostname.includes('youtube.com')) return;

  const script = document.createElement('script');
  script.textContent = `
    (function() {
      try {
        // Check if ytInitialPlayerResponse exists as a global
        if (typeof ytInitialPlayerResponse !== 'undefined') {
          var el = document.createElement('div');
          el.id = '__mp3_extractor_yt_data';
          el.style.display = 'none';
          el.textContent = JSON.stringify(ytInitialPlayerResponse);
          document.body.appendChild(el);
        }
      } catch(e) {}
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DETECT_MP3S') {
    const mp3s = detectMP3Links();
    sendResponse({ mp3s });
  } else if (message.type === 'EXTRACT_YOUTUBE_DATA') {
    // First try injecting and reading from main world
    injectYouTubeDataExtractor();

    // Small delay to let the injected script run
    setTimeout(() => {
      const data = extractYouTubePlayerData();
      sendResponse({ playerData: data });
    }, 100);

    // Return true for async sendResponse
    return true;
  }
  return true;
});

// Monitor for dynamically added MP3 elements
let mp3DetectionTimer: ReturnType<typeof setTimeout> | null = null;

const observer = new MutationObserver((_mutations) => {
  if (mp3DetectionTimer) clearTimeout(mp3DetectionTimer);
  mp3DetectionTimer = setTimeout(() => {
    const mp3s = detectMP3Links();
    if (mp3s.length > 0) {
      chrome.runtime.sendMessage({
        type: 'MP3S_DETECTED',
        mp3s
      }).catch(() => {
        // Ignore errors when service worker is not ready
      });
    }
  }, 500);
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// On YouTube pages, extract player data when page loads
if (window.location.hostname.includes('youtube.com')) {
  injectYouTubeDataExtractor();
}

console.log('MP3 Extractor content script loaded');
