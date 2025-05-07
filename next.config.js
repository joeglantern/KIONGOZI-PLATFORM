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
  },
  // Add experimental options to improve hydration
  experimental: {
    // This makes Next.js ignore certain properties during hydration to avoid mismatches
    optimizeCss: true,
  },
  // External packages that should be resolved for server components
  serverExternalPackages: ['react-dom']
};

module.exports = nextConfig; 