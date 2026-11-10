/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false, // Security: Remove X-Powered-By: Next.js to prevent tech-stack fingerprinting
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'off',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org;",
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization, x-telegram-init-data, x-init-data, x-admin-key, x-telegram-bot-api-secret-token',
        },
      ],
    },
  ],
};

export default nextConfig;
