// Repro : banc mesure-pico réel, état d'Act1 selon le rapport cyclique de GP15.
import esbuild from 'esbuild';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'c:/- VS Code/Extensions/Kablix';
const tmp = mkdtempSync(join(tmpdir(), 'kx-act1-'));
const out = join(tmp, 'model.mjs');
await esbuild.build({
  entryPoints: [join(ROOT, 'src/webview/diagram/model.mts')],
  outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
  loader: { '.svg': 'text', '.webp': 'dataurl' },
});
const model = await import(pathToFileURL(out).href);

const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = 3.3;
const psu = (id) => (id === 'Alim1' ? 5 : null);

const passe = (duty, brocheHaute) => {
  const read = (n) => (n === 'GP15' ? brocheHaute : false);
  const pwm = (pin) => (pin === 'GP15' ? duty : null);
  for (let i = 0; i < 3; i++) {
    model.setActiveBridges(model.commandedBridges(d, read, vcc, psu, undefined, pwm));
  }
  const dutyFn = (mcuPin) => (mcuPin === 'GP15' ? duty : duty);
  const mot = model.motorStates(d, vcc, dutyFn, psu)[0];
  const met = model.meterReadings(d, vcc, (p) => (p === 'GP15' && brocheHaute ? 'high' : 'hiz'), psu);
  model.setActiveBridges([]);
  const m = (id) => { const x = met.find((y) => y.partId === id); return x?.value === null || x?.value === undefined ? String(x?.value) : x.value.toFixed(4); };
  return `duty ${String(duty*100).padStart(3)}% ${brocheHaute?'HAUT':'BAS '} | moteur U=${mot.volts.toFixed(3)} I=${mot.amps.toFixed(4)} v=${mot.speed.toFixed(3)} fault=${mot.fault} powered=${mot.powered} | M1=${m('M1')} M2=${m('M2')}`;
};
for (const duty of [0, 0.25, 0.5, 0.75, 1]) {
  console.log(passe(duty, true));
  console.log(passe(duty, false));
}
