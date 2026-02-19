/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  outputFileTracingRoot: require('path').join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'https://kiongozi-api.onrender.com/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
