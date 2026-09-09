import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { gunzipSync, inflateRawSync } from 'node:zlib';

// Lecture zip minimale : on cherche diagram.json dans l'archive .projix.
function lireZip(buf, nom) {
	let i = buf.length - 22;
	while (i > 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
	const n = buf.readUInt16LE(i + 10);
	let off = buf.readUInt32LE(i + 16);
	for (let k = 0; k < n; k++) {
		const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
		const name = buf.toString('utf8', off + 46, off + 46 + nl);
		const lho = buf.readUInt32LE(off + 42);
		if (name === nom) {
			const method = buf.readUInt16LE(off + 10);
			const csize = buf.readUInt32LE(off + 20);
			const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28);
			const data = buf.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize);
			return method === 0 ? data : inflateRawSync(data);
		}
		off += 46 + nl + el + cl;
	}
	return null;
}

for (const [etiq, src] of [['DÉPÔT', null], ['FRANK', 'disque']]) {
	const buf = src
		? readFileSync('testkablix/Arduino/mesure-uno/mesure-uno.projix')
		: execSync('git show HEAD:testkablix/Arduino/mesure-uno/mesure-uno.projix', { encoding: 'buffer', maxBuffer: 1 << 28 });
	const d = JSON.parse(lireZip(buf, 'diagram.json').toString('utf8'));
	const cp = d.customParts ?? [];
	console.log(`### ${etiq} : ${buf.length} o | ${d.parts.length} composants | ${d.connections?.length ?? d.wires?.length ?? 0} fils | customParts ${cp.length} (${JSON.stringify(cp).length} o)`);
	console.log('   ', d.parts.map((p) => `${p.type}:${p.id}`).join(' | '));
	if (cp.length) console.log('    perso :', cp.map((c) => c.type ?? c.id ?? '?').join(', '));
}
