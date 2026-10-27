import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingExcludes: {
    "/*": [
      "./.work/**", "./deliverables/**", "./.git/**", "./README.md", "./AGENTS.md",
      "./projects/**/node_modules/**", "./projects/**/bin/**", "./projects/**/obj/**", "./projects/**/dist/**",
      "./benchmark/*.db", "./benchmark/go-demo", "./benchmark/go-demo.exe",
    ],
  },
};

export default config;
