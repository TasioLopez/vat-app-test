/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // <- this stops the ESLint step in `next build`
  },
  typescript: {
    ignoreBuildErrors: true,    // <- this prevents TS errors from failing CI
  },
};

module.exports = nextConfig;
