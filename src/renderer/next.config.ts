import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const backend = process.env.NEXT_PUBLIC_COSMO_BACKEND;
const isElectronExport = !isDevelopment && backend !== "http";

const nextConfig: NextConfig = {
    output: "export",
    // Relative assets are required for the packaged static export, but they break
    // nested-route chunk loading in the Next dev server.
    assetPrefix: isElectronExport ? "./" : undefined,
};

export default nextConfig;
