import type { NextConfig } from "next";

// GitHub Pages serves a project site under /<repository>/, so the deploy workflow sets BASE_PATH.
// Locally (npm run dev / npm run build without BASE_PATH) the app is served from the root.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // fully static site: every page is pre-rendered to ./out and the 3D scene runs in the browser
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // the image optimiser needs a server, which GitHub Pages does not have
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
