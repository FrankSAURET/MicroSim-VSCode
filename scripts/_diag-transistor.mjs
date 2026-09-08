// Décompose la lecture du banc transistor : tensions de chaque nœud.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-dt-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
  return import(pathToFileURL(join(tmp, o)).href);
};
const M = await b('src/webview/diagram/model.mts', 'model.mjs');
const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });
const NPN = { pkg: 'to92', symbol: 'npn', named: '1', e: '1', b: '2', c: '3', gain: '100', vcemax: '40', icmax: '0.6' };
const charge = process.argv[2] ?? '100';
const d = {
  parts: [P('uno','uno'), P('psu','alim',{voltage:'5',maxcurrent:'1'}),
    P('r1','resistor',{value:charge}), P('rb','resistor',{value:'1000'}),
    P('q1','transistor',{...NPN, vcesat:'0.2'}), P('mv','multimetre',{mode:'voltage'})],
  wires: [W('w1',pin('psu','V+'),pin('r1','1')), W('w2',pin('r1','2'),pin('q1','C')),
    W('w3',pin('q1','E'),pin('psu','GND')),
    W('w4',pin('uno','8'),pin('rb','1')), W('w5',pin('rb','2'),pin('q1','B')),
    W('w6',pin('q1','C'),pin('mv','+')), W('w7',pin('q1','E'),pin('mv','GND'))],
};
const readPin = (n) => String(n) === '8';
M.setActiveBridges(M.commandedBridges(d, readPin, 5));
const v = M.meterReadings(d, 5, (n) => (readPin(n) ? 'high' : 'low')).find((x) => x.partId === 'mv');
console.log(`charge ${charge} Ω  ->  voltmètre ${v.value} V   (attendu 0.2)`);
// Courant théorique : (5 - 0,2) / (charge + RAIL_OHMS côté haut + RAIL_OHMS côté bas)
for (const rail of [0, 1, 2]) {
  const i = (5 - 0.2) / (Number(charge) + rail);
  console.log(`   si ${rail} Ω de rail : I = ${(i*1000).toFixed(2)} mA, chute rail = ${(i*rail).toFixed(4)} V, lecture = ${(0.2 + i*rail).toFixed(4)} V`);
}
