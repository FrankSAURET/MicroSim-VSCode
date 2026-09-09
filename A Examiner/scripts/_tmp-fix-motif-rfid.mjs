// Le motif cherchait `\n` LITTÉRAL (barre oblique inverse + n) après l'accent
// inverse, alors que le code écrit un vrai saut de ligne dans son gabarit : le
// contrôle ne pouvait pas passer, quel que soit le comportement de la
// simulation. `\s*` couvre les deux écritures et survit à un reformatage.
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'scripts/verify-rfid.mjs';
let s = readFileSync(p, 'utf8');

const avant = '/appendSerial\\(`\\n── \\$\\{t\\(\'Wiring error\'\\)\\}/';
const apres = '/appendSerial\\(`\\s*── \\$\\{t\\(\'Wiring error\'\\)\\}/';
if (!s.includes(avant)) throw new Error('motif introuvable');
s = s.replace(avant, apres);

writeFileSync(p, s);
console.log('motif corrigé');
