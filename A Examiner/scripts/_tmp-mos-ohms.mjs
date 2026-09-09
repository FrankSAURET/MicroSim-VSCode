// Que rend `mosGateVolts` sur le banc « grille attaquée par une broche à travers
// 1 kΩ » ? Le lot .59 se sert de sa résistance de Thévenin pour dire QUI tient la
// grille — il faut donc savoir ce qu'elle vaut vraiment ici.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-mosohms');
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'm.mjs'),
	"export { transistorStates, commandedBridges, setActiveBridges, meterReadings } from '../../src/webview/diagram/model.mjs';\n");
const out = join(CACHE, 'm.bundle.mjs');
await esbuild({ entryPoints: [join(CACHE, 'm.mjs')], outfile: out, bundle: true, platform: 'node',
	format: 'esm', logLevel: 'silent', loader: { '.svg': 'text', '.webp': 'dataurl' }, absWorkingDir: ROOT });
const M = await import(pathToFileURL(out).href);

const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });
const MOS = { pkg: 'to92', symbol: 'nmos', named: '1', g: '2', d: '1', s: '3',
	gain: '0', vcemax: '60', icmax: '0.5', rdson: '2.5' };

// Banc identique à verify-transistor : alim → charge 100 Ω → drain, source à la
// masse, grille par D8 à travers 1 kΩ.
const banc = (vgsth) => ({
	parts: [P('uno', 'uno'), P('psu', 'alim', { voltage: '5', maxcurrent: '1' }),
		P('r1', 'resistor', { value: '100' }), P('rb', 'resistor', { value: '1000' }),
		P('q1', 'transistor', { ...MOS, vgsth }), P('mv', 'multimetre', { mode: 'voltage' })],
	wires: [W('w1', pin('psu', 'V+'), pin('r1', '1')), W('w2', pin('r1', '2'), pin('q1', 'D')),
		W('w3', pin('q1', 'S'), pin('psu', 'GND')),
		W('w4', pin('uno', '8'), pin('rb', '1')), W('w5', pin('rb', '2'), pin('q1', 'G')),
		W('w6', pin('q1', 'D'), pin('mv', '+')), W('w7', pin('q1', 'S'), pin('mv', 'GND'))],
});

for (const vgsth of ['2.1', '6']) {
	const d = banc(vgsth);
	const readPin = (n) => String(n) === '8';
	M.setActiveBridges(M.commandedBridges(d, readPin, 5));
	const t = M.transistorStates(d, readPin, 5).find((x) => x.partId === 'q1');
	const v = M.meterReadings(d, 5, (n) => (readPin(n) ? 'high' : 'low')).find((x) => x.partId === 'mv')?.value;
	M.setActiveBridges([]);
	console.log(`vgsth=${vgsth}  on=${t?.on}  gateVolts=${t?.gateVolts}  gatePin=${t?.gatePin}  voltmetre=${v}`);
}
