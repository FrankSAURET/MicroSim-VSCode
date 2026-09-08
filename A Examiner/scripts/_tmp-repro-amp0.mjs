// Repro : ampèremètre en série dans la branche d'un moteur haché.
// À 0 % de rapport cyclique il rend null au lieu de 0 A.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'c:/- VS Code/Extensions/Kablix';
const tmp = mkdtempSync(join(tmpdir(), 'kx-repro-'));
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

// broche 9 → 1k → base ; 5V → moteur → ampèremètre → collecteur ; émetteur → GND
const banc = {
  parts: [
    p('uno', 'uno'),
    p('q', 'npn'),
    p('rb', 'resistor', { value: '1000' }),
    p('m1', 'moteur-dc', { voltage: '5', current: '0.2' }),
    p('d1', 'diode'),
    p('mv', 'multimetre', { mode: 'voltage' }),
    p('ma', 'multimetre', { mode: 'current' }),
  ],
  wires: [
    w('w1', pn('uno', '9'), pn('rb', '1')),
    w('w2', pn('rb', '2'), pn('q', '2')),
    w('w3', pn('uno', '5V'), pn('m1', '1')),
    w('w4', pn('m1', '2'), pn('ma', '+')),
    w('w4b', pn('ma', 'GND'), pn('q', '3')),
    w('w5', pn('q', '1'), pn('uno', 'GND.1')),
    w('w6', pn('m1', '1'), pn('d1', 'K')),
    w('w7', pn('m1', '2'), pn('d1', 'A')),
    w('w8', pn('m1', '1'), pn('mv', '+')),
    w('w9', pn('m1', '2'), pn('mv', 'GND')),
  ],
};

const mesure = (duty, brocheLue) => {
  for (let i = 0; i < 3; i++) {
    model.setActiveBridges(
      model.commandedBridges(banc, (n) => (brocheLue ? n === '9' : false), 5, undefined, undefined,
        (pin) => (pin === '9' ? duty : null))
    );
  }
  const r = model.meterReadings(banc, 5, (pin) => (pin === '9' && brocheLue ? 'high' : 'hiz'));
  model.setActiveBridges([]);
  const v = r.find((x) => x.partId === 'mv');
  const a = r.find((x) => x.partId === 'ma');
  return { volts: v?.value, amps: a?.value };
};

for (const duty of [0, 0.25, 0.5, 1]) {
  const haut = mesure(duty, true);
  const bas = mesure(duty, false);
  console.log(`duty ${String(duty * 100).padStart(3)} %  | sommet V=${fmt(haut.volts)} A=${fmt(haut.amps)}  | creux V=${fmt(bas.volts)} A=${fmt(bas.amps)}`);
}
// broche franchement basse, sans PWM du tout
{
  for (let i = 0; i < 3; i++) model.setActiveBridges(model.commandedBridges(banc, () => false, 5));
  const r = model.meterReadings(banc, 5, () => 'hiz');
  model.setActiveBridges([]);
  console.log('sans PWM, broche basse |', 'V=' + fmt(r.find((x) => x.partId === 'mv')?.value), 'A=' + fmt(r.find((x) => x.partId === 'ma')?.value));
}
function fmt(x) { return x === null || x === undefined ? String(x) : x.toFixed(4); }
