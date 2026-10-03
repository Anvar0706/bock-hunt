/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'ALLOWALL',
        },
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization, x-telegram-bot-api-secret-token, x-init-data',
        },
      ],
    },
  ],
};

export default nextConfig;
