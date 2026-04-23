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
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    // Tree-shake icon and UI packages: only bundle what's actually imported
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'framer-motion',
      'recharts',
    ],
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

