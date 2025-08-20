/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    // This makes Next.js ignore certain properties during hydration to avoid mismatches
    optimizeCss: true,
  },
  // Removed invalid key serverExternalPackages for Next 14
  // Required for Netlify
  output: 'standalone'
};

module.exports = nextConfig; 