function normalizeBasePath(bp: string) {
  if (!bp) return "";
  let s = bp.trim();
  if (!s || s === "/") return "";
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

// We avoid env-based base path so the same build can run on:
// - localhost
// - preview domains
// - production domains
// - optional subpath mounts (reverse proxies)
//
// Instead, we derive basePath from the current URL when running in the browser.
// Example: /9tharc/wallet -> basePath "/9tharc"
const SUFFIX_ROUTES = [
  "/",
  "/app",
  "/play",
  "/wallet",
  "/profile",
  "/create",
  "/explore",
  "/discover",
  "/transactions",
  "/appeals",
  "/admin",
] as const;

let cachedBasePath: string | null = null;

export function getBasePath() {
  if (cachedBasePath != null) return cachedBasePath;
  if (typeof window === "undefined") return "";
  const path = window.location?.pathname ?? "/";

  // Find the first suffix match; everything before it is the basePath.
  for (const suffix of SUFFIX_ROUTES) {
    if (suffix === "/") {
      if (path === "/") {
        cachedBasePath = "";
        return "";
      }
      continue;
    }
    if (path === suffix) {
      cachedBasePath = "";
      return "";
    }
    if (path.endsWith(suffix) && path.length > suffix.length) {
      const prefix = path.slice(0, path.length - suffix.length);
      cachedBasePath = normalizeBasePath(prefix);
      return cachedBasePath;
    }
  }

  // Fallback: if we can't detect, assume root.
  cachedBasePath = "";
  return "";
}

export function withBasePath(path: string) {
  const bp = getBasePath();
  if (!path) return bp || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (!bp) return path;
  if (path === "/") return bp;
  return `${bp}${path}`;
}

