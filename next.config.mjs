/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = 'nobel-kids';
const githubBasePath = isGitHubPages ? `/${repositoryName}` : '';

const nextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: githubBasePath,
  assetPrefix: githubBasePath,
  trailingSlash: true,
  images: {
    unoptimized: isGitHubPages,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  allowedDevOrigins: ['*.e2b.app'],
  poweredByHeader: false,
};

export default nextConfig;
