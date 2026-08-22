import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@bharatlens/shared'],
  output: 'standalone',
  outputFileTracingRoot: path.join(appDir, '../..'),
  poweredByHeader: false,
};

export default nextConfig;
