// Rejoue le seul contrôle en cause, sans les 13 minutes du banc complet.
import { readFileSync } from 'node:fs';

const simSrc = readFileSync('src/webview/sim.mts', 'utf8');
const lancement = simSrc.slice(simSrc.indexOf('function startRun'), simSrc.indexOf('function stopRun'));

const ancien = /appendSerial\(`\n── \$\{t\('Wiring error'\)\}/;
const neuf = /appendSerial\(`\s*── \$\{t\('Wiring error'\)\}/;
const flash = /flashStatus\(t\('Error: \{0\}', detail\)\)/;

console.log('motif AVANT (\\n littéral) :', ancien.test(lancement) ? 'trouve' : 'NE TROUVE PAS');
console.log('motif APRÈS (\\s*)        :', neuf.test(lancement) ? 'trouve' : 'NE TROUVE PAS');
console.log('flashStatus              :', flash.test(lancement) ? 'trouve' : 'NE TROUVE PAS');
console.log('=> contrôle :', neuf.test(lancement) && flash.test(lancement) ? 'PASSE' : 'ECHOUE');
