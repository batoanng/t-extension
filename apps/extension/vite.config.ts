import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const defaultPort = 3001;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');
  const configuredPort = Number.parseInt(env.VITE_APP_PORT ?? '', 10);

  return {
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : defaultPort,
    },
  };
});
