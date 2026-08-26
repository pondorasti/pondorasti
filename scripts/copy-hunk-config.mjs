import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('out/.hunk', { recursive: true });
copyFileSync('.hunk/config.json', 'out/.hunk/config.json');
