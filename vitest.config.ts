import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec,pbt,integration}.ts',
      '../scripts/__tests__/**/*.{test,spec,pbt}.ts',
    ],
  },
});
