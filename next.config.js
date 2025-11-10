/** @type {import('next').NextConfig} */
const strip = (s = "") => s.replace(/\/+$/, "");
const stripApi = (s = "") => s.replace(/\/api$/i, "");

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
    // Single source of truth for backend origin (works in dev & prod)
    // Prefer BACKEND_ORIGIN, else NEXT_PUBLIC_API_URL, else sensible defaults
    const envBase =
      strip(process.env.BACKEND_ORIGIN) ||
      strip(process.env.NEXT_PUBLIC_API_URL);

    const isProd = process.env.NODE_ENV === "production";
    const fallback = isProd
      ? "https://horizon-backend-jsuw.onrender.com"
      : "http://localhost:4000";

    const origin = strip(stripApi(envBase || fallback));

    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },

  // Optional: basic security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
