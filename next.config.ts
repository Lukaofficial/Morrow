import type { NextConfig } from "next";

const config: NextConfig = {
  // libSQL ships a native binding, so it has to stay out of the server bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Pin the root, so a stray lockfile higher up the disk can't change what gets traced.
  outputFileTracingRoot: process.cwd(),
  agentRules: false,
  devIndicators: false,
};

export default config;
