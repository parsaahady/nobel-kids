/**
 * Next.js configuration — STATIC EXPORT build.
 *
 * `output: 'export'` makes `next build` emit a folder of plain HTML/CSS/JS
 * (out/) that any Apache host can serve. There is no Node process in
 * production: all dynamic behaviour comes from the PHP API under /api.
 *
 * `images.unoptimized` is required because next/image's optimizer is a server
 * feature. Source images are already WebP and correctly sized, so the visual
 * result is identical — same markup, same layout, same CSS.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  poweredByHeader: false,

  // Emit /products/index.html instead of /products.html so Apache serves clean
  // URLs from DirectoryIndex without any rewrite rule.
  trailingSlash: true,

  images: {
    // No Node image optimizer on shared hosting.
    unoptimized: true,
  },

  // Dev-only: the workspace preview runs on an e2b subdomain.
  allowedDevOrigins: ['*.e2b.app'],
};

export default nextConfig;
