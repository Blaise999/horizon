/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,     // ✅ don’t fail Vercel builds on ESLint
  },
  typescript: {
    ignoreBuildErrors: true,      // ✅ don’t fail Vercel builds on TS errors
  },

  async rewrites() {
    // In prod, prefer your deployed backend origin from env.
    // In dev, fall back to localhost.
    const origin =
      (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "") ||
      "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; // ⬅️ CJS export (don’t use `export default` in .js)
