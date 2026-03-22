import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    output: "export",
    // Relative assets are required for the packaged static export, but they break
    // nested-route chunk loading in the Next dev server.
    assetPrefix: isDevelopment ? undefined : "./",
};

export default nextConfig;
