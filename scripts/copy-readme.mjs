import { copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootReadme = join(__dirname, '..', 'README.md');

// Copy to react package
copyFileSync(rootReadme, join(__dirname, '..', 'packages', 'react', 'README.md'));

// Copy to cli package
copyFileSync(rootReadme, join(__dirname, '..', 'packages', 'cli', 'README.md'));

console.log('README.md copied to packages');
