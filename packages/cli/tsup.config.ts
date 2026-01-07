import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    // Bundle the shared package into the output
    noExternal: ['@react-component-selector-mcp/shared'],
    treeshake: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    // Shebang is already in src/cli.ts, no banner needed
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: {
      resolve: true,
    },
    clean: false,
    // Bundle the shared package into the output
    noExternal: ['@react-component-selector-mcp/shared'],
    treeshake: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
]);
