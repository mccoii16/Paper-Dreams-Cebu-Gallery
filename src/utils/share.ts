/**
 * Utility for sharing events and media files using the Web Share API when supported,
 * with graceful fallback to clipboard copying.
 */

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

export interface ShareResult {
  success: boolean;
  method: 'web-share' | 'clipboard' | 'cancelled' | 'error';
  message: string;
}

export async function shareContent(options: ShareOptions): Promise<ShareResult> {
  const { title, text, url } = options;

  // 1. Try Native Web Share API (mobile devices, modern Safari/Chrome)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ title, text, url })) {
    try {
      await navigator.share({
        title,
        text: text || title,
        url,
      });
      return {
        success: true,
        method: 'web-share',
        message: 'Shared successfully.',
      };
    } catch (err: unknown) {
      // User tapped cancel in native share sheet
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          method: 'cancelled',
          message: 'Share cancelled.',
        };
      }
      // If native share fails for permission reason, proceed to clipboard fallback
      console.warn('Web Share failed, falling back to clipboard:', err);
    }
  }

  // 2. Clipboard fallback
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return {
        success: true,
        method: 'clipboard',
        message: 'Link copied to clipboard.',
      };
    } else {
      // Legacy document.execCommand fallback for older mobile webviews
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return {
          success: true,
          method: 'clipboard',
          message: 'Link copied to clipboard.',
        };
      }
      throw new Error('Clipboard copy not permitted');
    }
  } catch (error) {
    return {
      success: false,
      method: 'error',
      message: 'Could not copy link automatically. Please copy the URL from your browser address bar.',
    };
  }
}
