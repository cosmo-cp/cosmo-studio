import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    trailingSlash: true,
    transpilePackages: ['core', 'contracts', 'guardrails'],
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
