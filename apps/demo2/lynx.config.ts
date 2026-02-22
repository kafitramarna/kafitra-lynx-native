import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { defineConfig } from '@lynx-js/rspeedy';

import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Redirect to TypeScript source so rspeedy/pluginReactLynx processes
    // CameraView.tsx and generates Lynx snapshots for the <camera> element.
    // Resolves to a path outside node_modules → rspack transforms it
    // automatically (no source.include needed, which was causing
    // __BACKGROUND__ ReferenceError by breaking pluginReactLynx's DefinePlugin).
    alias: {
      '@kafitra/lynx-camera': path.resolve(
        __dirname,
        '../../packages/lynx-camera/src/index.ts',
      ),
    },
  },
  tools: {
    rspack: {
      resolve: {
        // ESM packages use ".js" in relative imports (e.g. "./CameraView.js")
        // but the real files are ".ts"/".tsx". Rspack tries these first.
        extensionAlias: {
          '.js': ['.ts', '.tsx', '.js'],
        },
      },
    },
  },
  plugins: [
    pluginQRCode({
      schema(url) {
        // We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
        return `${url}?fullscreen=true`;
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck(),
  ],
});
