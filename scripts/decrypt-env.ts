import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const envFiles = readdirSync('.').filter((file) => {
  if (!file.startsWith('.env')) return false;
  if (file.endsWith('.keys')) return false;
  if (file === '.env.example') return false;

  return true;
});

if (envFiles.length === 0) {
  console.log('No environment files found.');
  process.exit(0);
}

for (const file of envFiles) {
  console.log(`Decrypting ${file}...`);

  execSync(`npx dotenvx decrypt -f "${file}"`, {
    stdio: 'inherit',
  });
}

console.log(`Decrypted ${envFiles.length} environment file(s).`);
