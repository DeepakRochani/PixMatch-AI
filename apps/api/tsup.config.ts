import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  noExternal: [/@pixmatch\/.*/],
  external: ['@prisma/client'],
  clean: true,
  sourcemap: false,
});
