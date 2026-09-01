import { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Next 16.3 + Vercel's adapter no longer emit next-server.js.nft.json, so
  // standalone packaging ENOENTs in onBuildComplete. Vercel ignores standalone
  // anyway; keep it for Docker. https://github.com/vercel/next.js/issues/96646
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ['pino', 'pino-pretty', '@prisma/client', 'pg'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
      { protocol: 'https', hostname: 'github.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
