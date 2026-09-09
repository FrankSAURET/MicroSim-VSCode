import { readFileSync, writeFileSync } from 'node:fs';
const p = 'C:/- VS Code/Extensions/Kablix/package.json';
const j = JSON.parse(readFileSync(p, 'utf8'));
const s = j.scripts;
if (!s['verify:reouverture']) {
	// Insertion juste après verify:etiquette, pour garder les bancs d'atelier groupés.
	const neuf = {};
	for (const [k, v] of Object.entries(s)) {
		neuf[k] = v;
		if (k === 'verify:etiquette') neuf['verify:reouverture'] = 'node scripts/verify-reouverture.mjs';
	}
	j.scripts = neuf;
}
if (!j.scripts['verify:all:serie'].includes('verify:reouverture')) {
	j.scripts['verify:all:serie'] += ' && npm run verify:reouverture';
}
writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('ok');
