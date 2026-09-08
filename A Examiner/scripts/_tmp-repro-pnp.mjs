// Repro : moteur commandé par un PNP côté HAUT, broche hachée en PWM.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'c:/- VS Code/Extensions/Kablix';
const tmp = mkdtempSync(join(tmpdir(), 'kx-pnp-'));
const out = join(tmp, 'model.mjs');
await esbuild.build({
  entryPoints: [join(ROOT, 'src/webview/diagram/model.mts')],
  outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
  loader: { '.svg': 'text', '.webp': 'dataurl' },
});
const model = await import(pathToFileURL(out).href);

const p = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const w = (id, a, b) => ({ id, a, b });
const pn = (partId, pin) => ({ partId, pin });

// Côté haut : 5V → émetteur PNP, collecteur → moteur → GND.
// Base attaquée par la broche 9 à travers 1 kΩ : niveau BAS = conduction.
const banc = {
  parts: [
    p('uno', 'uno'),
    p('q', 'pnp', { symbol: 'pnp' }),
    p('rb', 'resistor', { value: '1000' }),
    p('m1', 'moteur-dc', { voltage: '5', current: '0.2' }),
    p('d1', 'diode'),
    p('mv', 'multimetre', { mode: 'voltage' }),
  ],
  wires: [
    w('w1', pn('uno', '9'), pn('rb', '1')),
    w('w2', pn('rb', '2'), pn('q', '2')),
    w('w3', pn('uno', '5V'), pn('q', '1')),
    w('w4', pn('q', '3'), pn('m1', '1')),
    w('w5', pn('m1', '2'), pn('uno', 'GND.1')),
    w('w6', pn('m1', '1'), pn('d1', 'K')),
    w('w7', pn('m1', '2'), pn('d1', 'A')),
    w('w8', pn('m1', '1'), pn('mv', '+')),
    w('w9', pn('m1', '2'), pn('mv', 'GND')),
  ],
};
console.log('pins pnp :', JSON.stringify(model.transistorPins?.(banc.parts[1]) ?? 'n/a'));

const mesure = (duty, brocheLue) => {
  for (let i = 0; i < 3; i++) {
    model.setActiveBridges(
      model.commandedBridges(banc, () => brocheLue, 5, undefined, undefined,
        (pin) => (pin === '9' ? duty : null))
    );
  }
  const v = model.meterReadings(banc, 5, (pin) => (pin === '9' ? (brocheLue ? 'high' : 'low') : 'hiz'))
    .find((x) => x.partId === 'mv')?.value;
  model.setActiveBridges([]);
  return v;
};
// Sans PWM : broche basse = moteur alimenté, broche haute = moteur arrêté.
const refBas = (() => {
  for (let i = 0; i < 3; i++) model.setActiveBridges(model.commandedBridges(banc, () => false, 5));
  const v = model.meterReadings(banc, 5, (pin) => (pin === '9' ? 'low' : 'hiz')).find((x) => x.partId === 'mv')?.value;
  model.setActiveBridges([]); return v;
})();
const refHaut = (() => {
  for (let i = 0; i < 3; i++) model.setActiveBridges(model.commandedBridges(banc, () => true, 5));
  const v = model.meterReadings(banc, 5, (pin) => (pin === '9' ? 'high' : 'hiz')).find((x) => x.partId === 'mv')?.value;
  model.setActiveBridges([]); return v;
})();
console.log('sans PWM : base basse =', fmt(refBas), ' base haute =', fmt(refHaut));
for (const duty of [0, 0.25, 0.5, 0.75, 1]) {
  console.log(`duty haut ${String(duty * 100).padStart(3)} %  | broche vue haute ${fmt(mesure(duty, true))}  | broche vue basse ${fmt(mesure(duty, false))}`);
}
function fmt(x) { return x === null || x === undefined ? String(x) : x.toFixed(4); }
