/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },
  swcMinify: true,
  experimental: {
    forceSwcTransforms: true,
  }
}

module.exports = nextConfig