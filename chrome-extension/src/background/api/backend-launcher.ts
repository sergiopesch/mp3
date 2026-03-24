/**
 * Backend launcher — checks if the self-hosted backend is running
 * and starts it via Native Messaging if it isn't.
 */

const NATIVE_HOST_NAME = 'com.mp3.extractor';
const HEALTH_CHECK_TIMEOUT = 3000;

/**
 * Check if the backend is reachable by fetching the root URL.
 */
async function isBackendRunning(apiEndpoint: string): Promise<boolean> {
  try {
    const base = new URL(apiEndpoint).origin;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    const res = await fetch(base, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok || res.status === 404; // any HTTP response means it's up
  } catch {
    return false;
  }
}

interface NativeResponse {
  status: 'running' | 'stopped' | 'already_running' | 'started' | 'timeout' | 'error';
  message?: string;
}

/**
 * Send a message to the native messaging host.
 */
function sendNativeMessage(message: { action: string }): Promise<NativeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as NativeResponse);
    });
  });
}

/**
 * Ensure the backend is running. If not, attempt to start it via native messaging.
 * Returns true if the backend is ready, false if it could not be started.
 */
export async function ensureBackendRunning(apiEndpoint: string): Promise<{ ok: boolean; message?: string }> {
  // Quick check — is it already running?
  if (await isBackendRunning(apiEndpoint)) {
    return { ok: true };
  }

  // Try to start it via native messaging
  try {
    const response = await sendNativeMessage({ action: 'start' });

    if (response.status === 'started' || response.status === 'already_running') {
      return { ok: true };
    }

    if (response.status === 'timeout') {
      return { ok: false, message: 'Backend started but took too long to become ready. Try again in a few seconds.' };
    }

    return { ok: false, message: response.message || 'Failed to start the backend.' };
  } catch (err) {
    // Native messaging not available — host not installed
    return {
      ok: false,
      message: 'Backend is not running. Run the install script to enable auto-launch, or start the backend manually: npm start',
    };
  }
}
