// Empaquetage .vsix nommé avec la version interne (4 segments) : kablix-2026.9.2.55.vsix
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifeste = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'));
const nom = manifeste.name ?? 'extension';
const version = manifeste.buildNumber != null
	? `${manifeste.version}.${manifeste.buildNumber}`
	: manifeste.version;
// Nom relatif : le chemin du projet contient espaces et tirets, que le shell Windows découperait.
const sortie = `${nom}-${version}.vsix`;

const vsce = join(racine, 'node_modules', '@vscode', 'vsce', 'vsce');
const args = [vsce, 'package', '--no-dependencies', '--out', sortie, ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, { cwd: racine, stdio: 'inherit' });
process.exit(r.status ?? 1);
