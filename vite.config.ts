import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

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
  plugins: [react(), copyPublicDirSafe()],
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
