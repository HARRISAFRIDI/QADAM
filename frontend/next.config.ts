import type { NextConfig } from "next";

// Server-only: where the FastAPI backend lives. The browser never calls it directly;
// /api/v1/* is proxied same-origin (no CORS preflight, first-party cookies).
const API_TARGET = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_HOST;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_TARGET}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
