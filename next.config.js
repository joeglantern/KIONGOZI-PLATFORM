/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'undraw.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Required for Netlify deployment
  },
  // Add experimental options to improve hydration
  experimental: {
    // Removed optimizeCss due to critters module issues
  },
  // Removed invalid key serverExternalPackages for Next 14
  // Required for Netlify
  output: 'standalone'
};

module.exports = nextConfig; 