import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = resolve(rootDir, 'dist');
const releaseDir = resolve(rootDir, 'release');
const zipPath = resolve(releaseDir, 'developer-assistant-extension.zip');

await mkdir(releaseDir, { recursive: true });
await rm(zipPath, { force: true });

execFileSync('zip', ['-rq', zipPath, '.'], {
  cwd: distDir,
  stdio: 'inherit',
});
