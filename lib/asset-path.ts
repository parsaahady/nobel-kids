const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefixes files from /public when the site is hosted under a GitHub Pages subpath. */
export function assetPath(path: string) {
  if (!path || /^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (configuredBasePath && normalized.startsWith(`${configuredBasePath}/`)) return normalized;
  return `${configuredBasePath}${normalized}`;
}
