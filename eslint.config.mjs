import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next', message: 'domain must stay free of Next.js' },
            { name: 'react', message: 'domain must stay free of React' },
            { name: 'react-dom', message: 'domain must stay free of React' },
          ],
          patterns: [
            { group: ['next/*'], message: 'domain must stay free of Next.js' },
            { group: ['@/generated/*'], message: 'domain must stay free of Prisma' },
            { group: ['@prisma/*'], message: 'domain must stay free of Prisma' },
            { group: ['@/repositories/*'], message: 'domain must not import repositories' },
            { group: ['@/server/*'], message: 'domain must not import server composition' },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'src/generated/**',
    'prisma/migrations/**',
    'playwright-report/**',
    'test-results/**',
    'node_modules/**',
  ]),
]);

export default eslintConfig;
