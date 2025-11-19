/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static export for Capacitor (required per docs)
  output: 'export',
  // Disable image optimization for static export (required per docs)
  images: {
    unoptimized: true,
  },
  // Ensure assets work in Capacitor with relative paths
  assetPrefix: './',
  // Add trailing slashes for proper routing in Capacitor
  trailingSlash: true,
}

module.exports = nextConfig
