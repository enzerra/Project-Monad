import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  webpack(config) {
    // VIBE uses Google/EVM wallets; exclude Privy's optional Farcaster Solana connector.
    config.resolve.alias = { ...config.resolve.alias, "@farcaster/mini-app-solana": false };
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};

export default nextConfig;
