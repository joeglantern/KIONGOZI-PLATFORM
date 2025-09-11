/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds due to dependency conflict
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig