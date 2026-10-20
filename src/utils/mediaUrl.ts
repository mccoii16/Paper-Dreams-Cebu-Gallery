/**
 * Safely resolves media URLs for both local dev and production deployments (e.g., Vercel, Netlify, Cloud Run).
 * Converts legacy '/src/assets/images/...' to production-ready '/images/...' public paths
 * while preserving remote HTTPS links, data URIs, object blobs, and server-side uploads.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Return absolute or blob/data URLs as-is
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  // Map legacy /src/assets/images/... to /images/... which is copied to /dist in Vercel
  if (url.startsWith('/src/assets/images/')) {
    return `/images/${url.substring('/src/assets/images/'.length)}`;
  }
  if (url.startsWith('src/assets/images/')) {
    return `/images/${url.substring('src/assets/images/'.length)}`;
  }

  return url;
}
