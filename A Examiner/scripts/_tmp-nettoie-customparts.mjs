// Retire le `customParts` parasite d'un .projix sans TOUCHER au montage : une
// session F5 y dépose la bibliothèque perso entière (7 composants Grove, 815 ko)
// alors que le schéma n'en emploie aucun. Le montage, les étiquettes, les
// emplacements et le tracé des fils de Frank sont réécrits tels quels.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { inflateRawSync, deflateRawSync, crc32 } from 'node:zlib';

const chemin = process.argv[2];
const buf = readFileSync(chemin);

// Lecture du répertoire central : on récupère chaque entrée telle quelle.
let eocd = buf.length - 22;
while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
const nbre = buf.readUInt16LE(eocd + 10);
let off = buf.readUInt32LE(eocd + 16);
const entrees = [];
for (let k = 0; k < nbre; k++) {
	const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
	const nom = buf.toString('utf8', off + 46, off + 46 + nl);
	const lho = buf.readUInt32LE(off + 42);
	const methode = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20);
	const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28);
	const brut = buf.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize);
	entrees.push({ nom, contenu: methode === 0 ? brut : inflateRawSync(brut) });
	off += 46 + nl + el + cl;
}

const cible = entrees.find((e) => e.nom === 'diagram.json');
const d = JSON.parse(cible.contenu.toString('utf8'));
const avant = (d.customParts ?? []).length;
if (avant === 0) { console.log('déjà propre :', chemin); process.exit(0); }
// Employés par le schéma ? On ne retire QUE ceux dont aucun composant ne se sert.
const types = new Set(d.parts.map((p) => p.type));
const gardes = (d.customParts ?? []).filter((c) => types.has(c.type ?? c.id));
d.customParts = gardes;
cible.contenu = Buffer.from(JSON.stringify(d));

// Réécriture de l'archive (dégonflée, comme à l'origine).
copyFileSync(chemin, chemin + '.avant-nettoyage');
const morceaux = [], central = [];
let pos = 0;
for (const e of entrees) {
	const nom = Buffer.from(e.nom, 'utf8');
	const comp = deflateRawSync(e.contenu, { level: 9 });
	const crc = crc32(e.contenu);
	const lh = Buffer.alloc(30);
	lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
	lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18);
	lh.writeUInt32LE(e.contenu.length, 22); lh.writeUInt16LE(nom.length, 26);
	morceaux.push(lh, nom, comp);
	const ch = Buffer.alloc(46);
	ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
	ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20);
	ch.writeUInt32LE(e.contenu.length, 24); ch.writeUInt16LE(nom.length, 28);
	ch.writeUInt32LE(pos, 42);
	central.push(ch, nom);
	pos += lh.length + nom.length + comp.length;
}
const debutCentral = pos;
const tailleCentral = central.reduce((s, b) => s + b.length, 0);
const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entrees.length, 8);
fin.writeUInt16LE(entrees.length, 10); fin.writeUInt32LE(tailleCentral, 12);
fin.writeUInt32LE(debutCentral, 16);
writeFileSync(chemin, Buffer.concat([...morceaux, ...central, fin]));
console.log(`${chemin} : customParts ${avant} -> ${gardes.length}, ${buf.length} o -> ${readFileSync(chemin).length} o`);
