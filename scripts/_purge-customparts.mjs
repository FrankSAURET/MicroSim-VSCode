// Retire de deux .projix les `customParts` dont AUCUN composant du schéma ne se
// sert : des composants de bibliothèque déposés par une session F5, 92 ko pour
// rien. L'original est archivé dans A Examiner/ (jamais supprimé).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cibles = ['testkablix/mesure-pico.projix', 'testkablix/Arduino/mesure-uno/mesure-uno.projix'];

for (const rel of cibles) {
	const abs = join(ROOT, rel);
	const avant = readFileSync(abs);
	const zip = await JSZip.loadAsync(avant);
	const d = JSON.parse(await zip.file('diagram.json').async('string'));
	const utilises = new Set(d.parts.map((p) => p.type));
	const garde = (d.customParts ?? []).filter((c) => utilises.has(c.type ?? c.id));
	const jete = (d.customParts ?? []).length - garde.length;
	if (jete === 0) {
		console.log(rel, ': rien à retirer');
		continue;
	}
	const archive = join(ROOT, 'A Examiner', rel);
	mkdirSync(dirname(archive), { recursive: true });
	copyFileSync(abs, archive);
	if (garde.length) d.customParts = garde;
	else delete d.customParts;
	zip.file('diagram.json', JSON.stringify(d, null, 2));
	const apres = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
	writeFileSync(abs, apres);
	console.log(
		`${rel} : ${jete} customParts retirés, ${avant.length} -> ${apres.length} octets`
		+ ` (${d.parts.length} composants, ${d.wires.length} fils intacts)`
	);
}
