/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // or 'export' depending on your needs
  experimental: {
    serverComponentsExternalPackages: ['groq-sdk']
  }
}

module.exports = nextConfig
