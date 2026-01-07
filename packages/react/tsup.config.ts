import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  // Bundle the shared package into the output
  noExternal: ['@react-component-selector-mcp/shared'],
  treeshake: true,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  // Add "use client" directive at top of bundle
  banner: {
    js: '"use client";',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
