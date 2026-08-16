/**
 * Telegram link parser & opener helper.
 * Resolves blocked t.me links into native tg:// protocol deep links and mirror URLs.
 */

export interface TelegramUrlInfo {
  appUrl: string;
  webUrl: string;
  mirrorUrl: string;
}

export const getTelegramUrls = (url: string): TelegramUrlInfo => {
  if (!url) {
    return { appUrl: '', webUrl: '', mirrorUrl: '' };
  }

  const cleanUrl = url.trim();

  // Already a tg:// deep link
  if (cleanUrl.startsWith('tg://')) {
    return {
      appUrl: cleanUrl,
      webUrl: cleanUrl,
      mirrorUrl: cleanUrl
    };
  }

  // Match t.me/domain/post_id or telegram.me/domain/post_id or t.me/username
  const match = cleanUrl.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)(?:\/(\d+))?/i);
  if (match) {
    const domain = match[1];
    const postId = match[2];

    if (domain && domain.toLowerCase() !== 's') {
      const appUrl = postId
        ? `tg://resolve?domain=${domain}&post=${postId}`
        : `tg://resolve?domain=${domain}`;

      const mirrorUrl = postId
        ? `https://telegram.me/${domain}/${postId}`
        : `https://telegram.me/${domain}`;

      const webUrl = postId
        ? `https://t.me/${domain}/${postId}`
        : `https://t.me/${domain}`;

      return { appUrl, webUrl, mirrorUrl };
    }
  }

  // Generic link
  return {
    appUrl: `tg://msg_url?url=${encodeURIComponent(cleanUrl)}`,
    webUrl: cleanUrl,
    mirrorUrl: cleanUrl
  };
};

/**
 * Safely opens Telegram link via native app protocol first,
 * with graceful fallback to web mirror if app doesn't open.
 */
export const openTelegramLink = (e: React.MouseEvent | null, url: string) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const { appUrl, mirrorUrl, webUrl } = getTelegramUrls(url);

  if (appUrl) {
    // Trigger native Telegram app directly (bypasses DNS block on t.me)
    window.location.href = appUrl;
  }

  // Fallback to mirror URL in new tab if desktop app is not installed
  setTimeout(() => {
    window.open(mirrorUrl || webUrl, '_blank', 'noopener,noreferrer');
  }, 600);
};
