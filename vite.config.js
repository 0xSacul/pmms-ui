import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const localeFile = new URL('./locales/en.json', import.meta.url);

function uiAssets() {
  return {
    name: 'pmms-ui-assets',
    generateBundle(_options, bundle) {
      this.emitFile({ type: 'asset', fileName: 'locale.json', source: readFileSync(localeFile) });
      const license = readFileSync(new URL('./node_modules/svelte/LICENSE.md', import.meta.url), 'utf8');
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') file.code += `\n/*! Svelte runtime license\n${license}\n*/\n`;
      }
    },
    configureServer(server) {
      server.middlewares.use('/locale.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(readFileSync(localeFile));
      });
    },
    transformIndexHtml(html, context) {
      // Browser mocks do not initialize media; PMMS supplies these scripts in game.
      return context.server
        ? html.replace(/\s*<script src="\.\/(?:mediaelement\.min|wave)\.js"><\/script>/g, '')
        : html;
    },
  };
}

export default defineConfig({
  plugins: [svelte(), uiAssets()],
  publicDir: false,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'script.js',
        chunkFileNames: '[name].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'style.css';
          return '[name][extname]';
        },
      },
    },
  },
});
