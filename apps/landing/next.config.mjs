import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ["@self-study/ui"],
  webpack: (config) => {
    // Windows path casing (C:\ vs c:\) can load two React copies and break hooks.
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(rootDir, "node_modules/react"),
      "react-dom": path.join(rootDir, "node_modules/react-dom"),
    };
    return config;
  },
};

export default nextConfig;
