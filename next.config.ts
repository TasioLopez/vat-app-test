/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse pulls test fixtures when webpack bundles it; keep as Node external (Vercel build)
  serverExternalPackages: ['pdf-parse'],
  transpilePackages: ["@mdxeditor/editor"],
  eslint: {
    // ESLint 9 + Next patch can fail in some environments ("Failed to patch ESLint"); types still checked via tsc
    ignoreDuringBuilds: true,
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
