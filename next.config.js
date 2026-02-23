/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 31536000,
  },
  outputFileTracingRoot: require('path').join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'https://kiongozi-api.onrender.com/api/v1/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // Cache static files like images, fonts, and icons aggressively for 1 year
        source: '/(.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|mp4|webm))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
