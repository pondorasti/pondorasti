import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('out', { recursive: true, force: true });
cpSync('.next-hunk', 'out', { recursive: true });
mkdirSync('out/.hunk', { recursive: true });
copyFileSync('.hunk/config.json', 'out/.hunk/config.json');
