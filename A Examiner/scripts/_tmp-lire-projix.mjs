// Extrait diagram.json d'un .projix pour l'inspecter.
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
const zip = await JSZip.loadAsync(readFileSync(process.argv[2]));
const d = JSON.parse(await zip.file('diagram.json').async('string'));
const ids = process.argv.slice(3);
if (ids.length === 0) { console.log('parts:', d.parts.map((p) => `${p.id}:${p.type}`).join(' ')); process.exit(0); }
console.log('--- wires ---', (d.wires ?? d.connections ?? []).length);
for (const w of (d.wires ?? d.connections ?? [])) {
	const s = JSON.stringify(w);
	if (ids.some((id) => s.includes('"' + id + '"'))) console.log(s.slice(0, 300));
}
