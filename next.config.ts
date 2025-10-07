/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,   // Enable ESLint checks during build
  },
  typescript: {
    ignoreBuildErrors: false,    // Enable TypeScript checks during build
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'lucide-react', 'react-icons'],
  },
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
