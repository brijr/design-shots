/**
 * Normalises whatever the user typed into a URL we are willing to fetch.
 * Anything resolving to the machine itself or to a private network is refused
 * so the capture endpoint cannot be used to read internal services.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
]);

export function normalizeUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".") && !BLOCKED_HOSTS.has(url.hostname)) {
    return null;
  }
  return url;
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  return isPrivateAddress(host);
}

export function isPrivateAddress(address: string): boolean {
  const v4 = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  const v6 = address.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true; // unique local
  if (/^fe[89ab][0-9a-f]:/.test(v6)) return true; // link local
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return false;
}

/** The short form shown in the window bar: `stripe.com/pricing`. */
export function displayUrl(url: URL): string {
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.hostname.replace(/^www\./, "")}${path}`;
}
