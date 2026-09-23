import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
// Repo name is Grow, so basePath should be /Grow for github pages
// For local dev, leave empty
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // trailingSlash helps with GitHub Pages
  trailingSlash: true,
  basePath: isGithubPages ? "/Grow" : "",
  assetPrefix: isGithubPages ? "/Grow/" : undefined,
};

export default nextConfig;
