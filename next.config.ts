import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/login",
        destination: `${BASE_PATH}/login`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/admin/:path*",
        destination: `${BASE_PATH}/admin/:path*`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/dealer/:path*",
        destination: `${BASE_PATH}/dealer/:path*`,
        permanent: true,
        basePath: false,
      },
    ];
  },
  images: {
    path: `${BASE_PATH}/_next/image`,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
