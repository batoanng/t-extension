import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = resolve(rootDir, 'dist');
const iconDir = resolve(distDir, 'icons');
const sourceLogoPath = resolve(rootDir, 'assets', 'logo.png');
const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'production';
const env = loadEnv(mode, rootDir, '');
const packageJson = JSON.parse(
  await readFile(resolve(rootDir, 'package.json'), 'utf8'),
);

function getHostPermissions(serverBaseUrl) {
  const origin = new URL(serverBaseUrl).origin;

  return [`${origin}/*`];
}

const manifest = {
  manifest_version: 3,
  name: 'Developer Assistant',
  version: packageJson.version,
  description:
    'Developer assistant tools for improving prompts and working with AI agents.',
  action: {
    default_popup: 'index.html',
    default_title: 'Developer Assistant',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  permissions: ['storage'],
  host_permissions: getHostPermissions(
    env.VITE_SERVER_BASE_URL?.trim() || 'http://localhost:3000',
  ),
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
};

await mkdir(iconDir, { recursive: true });
await rm(resolve(distDir, 'manifest.json'), { force: true });
await writeFile(
  resolve(distDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

await Promise.all([
  copyFile(sourceLogoPath, resolve(iconDir, 'icon16.png')),
  copyFile(sourceLogoPath, resolve(iconDir, 'icon48.png')),
  copyFile(sourceLogoPath, resolve(iconDir, 'icon128.png')),
]);
