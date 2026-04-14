export function getAuthEmailRedirectUrl(path = "/dashboard"): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const fromWindow =
    typeof window !== "undefined" ? window.location.origin : "";
  const base = fromEnv || fromWindow;
  if (!base) return undefined;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
