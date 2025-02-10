import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  bundle: true,
  loader: {
    // Add JSON loader configuration
    '.json': 'json',
  },
  esbuildOptions: options => {
    // Explicitly allow JSON imports
    options.allowOverwrite = true
    options.resolveExtensions = ['.ts', '.js', '.json']
  },
})
