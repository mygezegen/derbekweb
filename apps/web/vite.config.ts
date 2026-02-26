import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function copyPublicDirSafe() {
  return {
    name: 'copy-public-dir-safe',
    closeBundle() {
      const publicDir = 'public';
      const outDir = 'dist';

      if (!existsSync(publicDir)) return;
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

      const copyRecursive = (src: string, dest: string) => {
        try {
          const entries = readdirSync(src);
          for (const entry of entries) {
            const srcPath = join(src, entry);
            const destPath = join(dest, entry);

            try {
              const stat = statSync(srcPath);
              if (stat.isDirectory()) {
                if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
              } else {
                copyFileSync(srcPath, destPath);
              }
            } catch (err) {
              console.warn(`Skipping file ${entry}: ${err}`);
            }
          }
        } catch (err) {
          console.warn(`Error reading directory ${src}: ${err}`);
        }
      };

      copyRecursive(publicDir, outDir);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    copyPublicDirSafe(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Köy Derneği Yönetim Sistemi',
        short_name: 'Köy Derneği',
        description: 'Köy derneği üyelik, etkinlik ve finans yönetim sistemi',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@dernek/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      external: []
    },
    copyPublicDir: false
  }
});
