// Note les deux bancs en échec PRÉEXISTANTS (vérifiés en remisant le lot) et
// bump le buildNumber 59 -> 60.
import { readFileSync, writeFileSync } from 'node:fs';

let s = readFileSync('todo.md', 'utf8');
const ancre = '12. ℹ️ **`mesure-pico.projix` n\'avait rien**';
const i = s.indexOf(ancre);
if (i < 0) throw new Error('ancre item 12 introuvable');
const fin = s.indexOf('\n', i);
const note = `
13. ⏳ **Deux bancs tombent, aucun de ce lot** — vérifié en remisant tout le lot, ils tombent pareil sur le dépôt d'origine. \`verify:rfid\` : « un câblage en échec est dit à l'élève (console + barre d'état) ». \`verify:i18n\` : six libellés de propriété non traduits (\`vcesat\` et \`vgsth\` sur \`transistor\`, \`npn\`, \`pnp\`) — celui-là part avec le lot de traduction d'avant publication, comme la règle le veut. Les 105 autres bancs passent.`;
s = s.slice(0, fin) + note + s.slice(fin);
writeFileSync('todo.md', s);

const p = 'package.json';
const j = JSON.parse(readFileSync(p, 'utf8'));
const avant = j.buildNumber;
j.buildNumber = String(Number(avant) + 1);
writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log(`todo.md noté | buildNumber ${avant} -> ${j.buildNumber} (version publique ${j.version}, inchangée)`);
