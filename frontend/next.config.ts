import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["react-globe.gl", "three"],
};

export default nextConfig;
