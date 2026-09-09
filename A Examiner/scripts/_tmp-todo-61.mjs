// Section v2026.9.2.61 + correction de la ligne 13 du lot .60, qui annonçait
// verify:rfid en échec (ce n'est plus le cas) et bump du buildNumber.
import { readFileSync, writeFileSync } from 'node:fs';

let s = readFileSync('todo.md', 'utf8');

// 1) La ligne 13 du lot .60 ne parle plus que de i18n : rfid est réparé au .61.
const avant13 = s.split('\n').find((l) => l.startsWith('13. ⏳ **Deux bancs tombent'));
if (!avant13) throw new Error('ligne 13 introuvable');
const apres13 = "13. ⏳ **Deux bancs tombent, aucun de ce lot** — vérifié en remisant tout le lot, ils tombent pareil sur le dépôt d'origine. `verify:rfid` : « un câblage en échec est dit à l'élève » — **réparé au lot .61**, c'était le contrôle qui était faux. `verify:i18n` : six libellés de propriété non traduits (`vcesat` et `vgsth` sur `transistor`, `npn`, `pnp`) — celui-là part avec le lot de traduction d'avant publication, comme la règle le veut. Les 105 autres bancs passent.";
s = s.replace(avant13, apres13);

// 2) Section du lot .61, AU-DESSUS de celle du .60.
const section = `# >>>>  v2026.9.2.61 — Un contrôle qui ne peut pas passer ne prouve rien

1. ✅ **\`verify:rfid\` tombait sur un motif impossible**, pas sur un défaut. Le contrôle « un câblage en échec est dit à l'élève » cherchait \`appendSerial(\\\`\\\\n──\` — un \`\\\\n\` LITTÉRAL, barre oblique inverse suivie d'un n — alors que [sim.mts](src/webview/sim.mts#L3872) écrit un VRAI saut de ligne dans son gabarit. Aucun octet ne pouvait correspondre : le contrôle était voué à l'échec quel que soit le comportement de la simulation.
2. ✅ **Le filet, lui, marchait depuis le début** : \`rebind()\` est bien enveloppé d'un \`try/catch\`, \`engine.start()\` est appelé quoi qu'il arrive, et l'erreur part dans la console série ET la barre d'état. Un câblage qui échoue n'emporte pas la simulation en silence. Le contrôle frère juste au-dessus (« le câblage des entrées est protégé au lancement ») passait, lui — son motif ne contient pas de saut de ligne : la même garantie était vérifiée en deux fois, dont une moitié mal écrite.
3. ✅ **Motif recalé sur \`\\\\s*\`** ([verify-rfid.mjs](scripts/verify-rfid.mjs#L243)), qui couvre les deux écritures et survivra au prochain reformatage du message. Le message avait vraisemblablement été mis en encadré (\`──\` de part et d'autre) sans que le banc suive. \`verify:rfid\` repasse au vert en entier.
4. ⏳ **Reste \`verify:i18n\`** : six libellés de propriété non traduits (\`vcesat\`, \`vgsth\` sur \`transistor\`/\`npn\`/\`pnp\`). Celui-là n'est pas un défaut — il part avec le lot de traduction d'avant publication, comme la règle le veut.

---

`;

const ancre = '# >>>>  v2026.9.2.60';
const i = s.indexOf(ancre);
if (i < 0) throw new Error('section .60 introuvable');
s = s.slice(0, i) + section + s.slice(i);
writeFileSync('todo.md', s);

const j = JSON.parse(readFileSync('package.json', 'utf8'));
const av = j.buildNumber;
j.buildNumber = Number(av) + 1;
writeFileSync('package.json', JSON.stringify(j, null, 2) + '\n');
console.log(`todo.md à jour | buildNumber ${av} -> ${j.buildNumber} (type ${typeof j.buildNumber})`);
