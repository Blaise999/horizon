/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // if you also hit TS compile blockers (you probably won't), add:
  // typescript: { ignoreBuildErrors: true },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:4000/api/:path*" },
    ];
  },
};

module.exports = nextConfig;
