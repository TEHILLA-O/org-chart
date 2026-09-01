import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'prisma/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
});
