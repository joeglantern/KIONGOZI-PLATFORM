const withSerwist = (nextConfig) => {
  if (process.env.NODE_ENV === 'production') {
    return require("@serwist/next").default({
      swSrc: "app/sw.ts",
      swDest: "public/sw.js",
    })(nextConfig);
  }
  return nextConfig;
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
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
      {
        // Cache HTML pages with stale-while-revalidate for faster perceived navigation
        source: '/((?!api).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

module.exports = withSerwist(nextConfig);

