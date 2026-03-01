// Content script for detecting MP3 URLs in web pages

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

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DETECT_MP3S') {
    const mp3s = detectMP3Links();
    sendResponse({ mp3s });
  }
  return true;
});

// Monitor for dynamically added MP3 elements
const observer = new MutationObserver((mutations) => {
  // Debounce detection to avoid excessive checks
  clearTimeout((window as any).mp3DetectionTimer);
  (window as any).mp3DetectionTimer = setTimeout(() => {
    const mp3s = detectMP3Links();
    if (mp3s.length > 0) {
      chrome.runtime.sendMessage({
        type: 'MP3S_DETECTED',
        mp3s
      });
    }
  }, 500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('MP3 Extractor content script loaded');
