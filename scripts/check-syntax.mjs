import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
function check(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) check(path);
    else if (/\.[mc]?js$/.test(path)) {
      const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status || 1);
      count++;
    }
  }
}
for (const folder of ['src', 'tests', 'scripts']) check(join(root, folder));
console.log(`Syntax checked ${count} project modules.`);