import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
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
			const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20);
			const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28);
			const data = buf.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize);
			return method === 0 ? data : inflateRawSync(data);
		}
		off += 46 + nl + el + cl;
	}
	return null;
}
const dep = JSON.parse(lireZip(execSync('git show HEAD:testkablix/Arduino/mesure-uno/mesure-uno.projix', { encoding: 'buffer', maxBuffer: 1 << 28 }), 'diagram.json'));
const fra = JSON.parse(lireZip(readFileSync('testkablix/Arduino/mesure-uno/mesure-uno.projix'), 'diagram.json'));
const cle = (p) => `${p.type}:${p.id}`;
const md = new Map(dep.parts.map((p) => [cle(p), p]));
let diff = 0;
for (const p of fra.parts) {
	const d = md.get(cle(p));
	if (!d) { console.log('NOUVEAU', cle(p)); diff++; continue; }
	if (d.x !== p.x || d.y !== p.y || (d.rotate ?? 0) !== (p.rotate ?? 0)) {
		console.log('BOUGÉ', cle(p), `${d.x},${d.y},r${d.rotate ?? 0} -> ${p.x},${p.y},r${p.rotate ?? 0}`); diff++;
	}
	const ad = JSON.stringify(d.attrs ?? {}), af = JSON.stringify(p.attrs ?? {});
	if (ad !== af) { console.log('ATTRS', cle(p), ad, '->', af); diff++; }
}
const fils = (d) => (d.connections ?? d.wires ?? []).map((w) => JSON.stringify(w).slice(0, 200)).sort();
const fd = fils(dep), ff = fils(fra);
const seulD = fd.filter((w) => !ff.includes(w)), seulF = ff.filter((w) => !fd.includes(w));
console.log(`fils : ${seulD.length} en moins, ${seulF.length} en plus`);
for (const w of seulD.slice(0, 8)) console.log('  - ', w);
for (const w of seulF.slice(0, 8)) console.log('  + ', w);
console.log(diff === 0 && !seulD.length && !seulF.length ? '=> MONTAGE IDENTIQUE' : `=> ${diff} écart(s) de composant`);
