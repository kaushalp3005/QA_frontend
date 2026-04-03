/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
  },
  async rewrites() {
    const apiBase = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiBase2 = process.env.BACKEND_API_URL2 || 'http://localhost:8000'
    return [
      {
        source: '/proxy/api2/:path*',
        destination: `${apiBase2}/:path*`,
      },
      {
        source: '/proxy/:path*',
        destination: `${apiBase}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig