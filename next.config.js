/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep builds unblocked while you iterate fast
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Helpful defaults
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Small perf tweak for icon libs, etc. (safe to keep; ignore if unused)
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Allow remote images in dashboards (tighten later if you want)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";

    // In production: no rewrites. The frontend should call the absolute API base.
    if (isProd) return [];

    // Dev: proxy /api → http://localhost:4000/api (or the origin from NEXT_PUBLIC_API_URL)
    // This keeps cookies first-party in dev and avoids CORS headaches.
    const envBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    // If devs accidentally set NEXT_PUBLIC_API_URL to ".../api", strip it to get the origin
    const origin = (envBase || "http://localhost:4000").replace(/\/api$/i, "");

    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },

  // Optional: add basic security headers for all routes (static + app routes)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
