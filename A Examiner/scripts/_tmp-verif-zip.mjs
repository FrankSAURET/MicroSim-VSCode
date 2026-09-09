// Contrôle d'intégrité d'un .projix après réécriture : chaque entrée se dégonfle
// et rend un JSON valide.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const chemin = process.argv[2];
const buf = readFileSync(chemin);
let i = buf.length - 22;
while (i > 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
const n = buf.readUInt16LE(i + 10);
let off = buf.readUInt32LE(i + 16);
for (let k = 0; k < n; k++) {
	const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
	const nom = buf.toString('utf8', off + 46, off + 46 + nl);
	const lho = buf.readUInt32LE(off + 42);
	const csize = buf.readUInt32LE(off + 20);
	const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28);
	const data = inflateRawSync(buf.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize));
	const j = JSON.parse(data.toString('utf8'));
	console.log(`${nom} : ${data.length} o, JSON valide (${Object.keys(j).join(', ')})`);
	off += 46 + nl + el + cl;
}
