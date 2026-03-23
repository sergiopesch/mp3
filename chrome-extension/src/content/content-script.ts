// Content script for detecting MP3 links on the current page

interface MP3Detection {
  url: string;
  source: 'link' | 'audio' | 'source';
  title?: string;
}

function detectMP3Links(): MP3Detection[] {
  const mp3s: MP3Detection[] = [];

  const links = document.querySelectorAll('a[href*=".mp3"]');
  links.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    mp3s.push({
      url: anchor.href,
      source: 'link',
      title: anchor.textContent?.trim() || undefined
    });
  });

  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    if (audio.src && audio.src.endsWith('.mp3')) {
      mp3s.push({
        url: audio.src,
        source: 'audio',
        title: audio.title || undefined
      });
    }

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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DETECT_MP3S') {
    const mp3s = detectMP3Links();
    sendResponse({ mp3s });
  }
  return true;
});
