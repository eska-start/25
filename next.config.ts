import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // 3D 캔버스/오디오가 개발 모드에서 두 번 초기화되지 않도록
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
