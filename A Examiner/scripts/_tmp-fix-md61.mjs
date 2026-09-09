// Dans le markdown, `\\n` et `\\s*` doivent s'écrire `\n` et `\s*` : le doublement
// venait du gabarit JS qui a produit la section.
import { readFileSync, writeFileSync } from 'node:fs';

let s = readFileSync('todo.md', 'utf8');
const paires = [
	['`appendSerial(\\`\\\\n──`', '`appendSerial(\\`\\n──`'],
	['un `\\\\n` LITTÉRAL', 'un `\\n` LITTÉRAL'],
	['**Motif recalé sur `\\\\s*`**', '**Motif recalé sur `\\s*`**'],
];
for (const [avant, apres] of paires) {
	if (!s.includes(avant)) throw new Error('introuvable : ' + avant);
	s = s.replace(avant, apres);
}
writeFileSync('todo.md', s);
console.log('markdown corrigé');
