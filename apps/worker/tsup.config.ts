import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  noExternal: [/@pixmatch\/.*/],
  external: ['@prisma/client'],
  clean: true,
  sourcemap: false,
});
