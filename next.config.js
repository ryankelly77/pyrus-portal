/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore the HTML prototype files during build
  pageExtensions: ['tsx', 'ts'],

  // Use deterministic chunk IDs to prevent cache corruption
  webpack: (config) => {
    config.optimization.moduleIds = 'deterministic'
    config.optimization.chunkIds = 'deterministic'
    return config
  },
}

module.exports = nextConfig
