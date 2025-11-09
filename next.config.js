/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";

    // In production: no rewrites. The frontend should call the absolute API base.
    if (isProd) return [];

    // Dev: proxy /api → http://localhost:4000/api
    const envBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    const origin = (envBase || "http://localhost:4000").replace(/\/api$/i, "");
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
  },
};

module.exports = nextConfig;
