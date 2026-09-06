// Diagnostic (hors suite, lancé à la main) : quels composants du catalogue
// rendent une mesure RÉALISTE au voltmètre / ampèremètre / oscilloscope.
//
// Montage : alim 5 V → composant → 1 kΩ → GND, voltmètre aux bornes du
// composant, ampèremètre en série. Un composant « vu » par le calcul montre
// une chute de tension et laisse passer un courant cohérent ; un composant
// ignoré du graphe résistif se comporte en fil parfait (0 V) ou en coupure.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-sonde-'));
const buildTo = async (entry, outfile) => {
  await esbuild.build({
    entryPoints: [join(root, entry)], outfile: join(tmp, outfile),
    bundle: true, platform: 'node', format: 'esm',
    loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent',
  });
  return import(pathToFileURL(join(tmp, outfile)).href);
};
const { meterReadings } = await buildTo('src/webview/diagram/model.mts', 'model.mjs');
const { CATALOG, partCategory } = await buildTo('src/webview/diagram/catalog.mts', 'catalog.mjs');

const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });

// Deux bornes à sonder par type de dipôle.
const BORNES = {
  led: ['A', 'C'], resistor: ['1', '2'], diode: ['A', 'K'],
  ldr: ['1', '2'], ntc: ['1', '2'], ptc: ['1', '2'],
  photodiode: ['A', 'K'], phototransistor: ['c', 'e'],
  'condo-np': ['1', '2'], 'condo-p-1': ['1', '2'], 'condo-p-2': ['1', '2'],
  relais: ['B1', 'B2'], ventilo: ['+', '-'], 'moteur-dc': ['1', '2'],
  buzzer: ['1', '2'],
};

const essai = (type, [p1, p2], attrs) => {
  const d = {
    parts: [
      P('psu', 'alim', { voltage: '5', maxcurrent: '1' }),
      P('dut', type, attrs),
      P('r', 'resistor', { value: '1000' }),
      P('mv', 'multimetre', { mode: 'voltage' }),
      P('ma', 'multimetre', { mode: 'current' }),
    ],
    wires: [
      W('w1', pin('psu', 'V+'), pin('dut', p1)),
      W('w2', pin('dut', p2), pin('r', '1')),
      W('w3', pin('r', '2'), pin('ma', '+')),
      W('w4', pin('ma', 'GND'), pin('psu', 'GND')),
      W('w5', pin('dut', p1), pin('mv', '+')),
      W('w6', pin('dut', p2), pin('mv', 'GND')),
    ],
  };
  const r = meterReadings(d, 5);
  return {
    u: r.find((m) => m.partId === 'mv')?.value ?? null,
    i: r.find((m) => m.partId === 'ma')?.value ?? null,
  };
};

const fmt = (x, n) => (x === null ? '—' : x.toFixed(n));
console.log('type | kind | catégorie | U dipôle (V) | I (mA) | verdict');
for (const d of CATALOG) {
  const b = BORNES[d.type];
  if (!b) continue;
  const { u, i } = essai(d.type, b, d.attrs);
  const verdict = u === null || i === null ? 'circuit ouvert'
    : Math.abs(u) > 1e-6 ? 'MODÉLISÉ' : 'fil parfait';
  console.log([d.type, d.kind, partCategory(d), fmt(u, 3), i === null ? '—' : (i * 1000).toFixed(3), verdict].join(' | '));
}
