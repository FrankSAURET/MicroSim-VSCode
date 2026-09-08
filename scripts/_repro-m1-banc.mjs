// Repro (hors suite) : M1 instable à 1 kHz sur le banc mesure-pico.
//
// Fait tourner le VRAI PicoEngine sur le VRAI schéma du banc et relève ce que
// lit M1 image par image (~16 ms), comme le fait refreshMeters de sim.mts. Sans
// le correctif, le niveau INSTANTANÉ de GP15 décidait si le transistor était
// passant : à 1 kHz une image sur deux tombe pendant la phase basse et la
// lecture saute. Avec, la broche qui hache est vue active en permanence et le
// rapport cyclique voyage par le `duty` du pont.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { firmwarePico } from './_firmware.mjs';
import { tk } from '../testkablix/_paths.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-m1b-'));
const load = async (entry, name) => {
  const out = join(tmp, name);
  await esbuild.build({
    entryPoints: [join(root, entry)], outfile: out, bundle: true,
    platform: 'node', format: 'esm',
    loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent',
  });
  return import(pathToFileURL(out).href);
};

const fw = firmwarePico();
if (!fw) { console.log('firmware absent'); process.exit(1); }
const { parseUf2 } = await load('src/shared/uf2.ts', 'uf2.mjs');
const { PicoEngine } = await load('src/webview/engines/pico.mts', 'pico.mjs');
const M = await load('src/webview/diagram/model.mts', 'model.mjs');
const segments = parseUf2(new Uint8Array(readFileSync(fw))).map((s) => ({ addr: s.addr, data: s.data }));

const zip = await JSZip.loadAsync(readFileSync(tk('mesure-pico.projix')));
const diagram = JSON.parse(await zip.files['diagram.json'].async('string'));

const DUTY = Number(process.argv[2] ?? 50);
const FREQ = Number(process.argv[3] ?? 1000);
const script = `from machine import Pin, PWM
import time
v = PWM(Pin(15))
v.freq(${FREQ})
v.duty_u16(${DUTY} * 65535 // 100)
r = Pin(14, Pin.OUT)
r.value(1)
print("pret")
while True:
    time.sleep_ms(200)
`;

const engine = new PicoEngine({ kind: 'flash', segments, script });
engine.setPulseMonitors(['GP15']);
let serie = '', pret = false;
engine.onSerial = (c) => { serie += c; if (serie.includes('pret')) pret = true; };
engine.start();

const vcc = 3.3;
const readPin = (p) => engine.readDigital(p);
const drive = (p) => engine.readPinDrive?.(p) ?? 'hiz';
const duty = (p) => (engine.pulseActive?.(p) ? engine.readPwmDuty?.(p) ?? null : null);
const moyennePwm = (p) => (engine.pulseActive?.(p) ? (engine.readPwmDuty?.(p) ?? 1) * vcc : null);

const suivi = new Map();
const t0 = Date.now();
await new Promise((res) => {
  const t = setInterval(() => {
    if (Date.now() - t0 > 40000) { clearInterval(t); res(); return; }
    if (!pret) return;
    M.setActiveBridges(M.commandedBridges(diagram, readPin, vcc, undefined, undefined, duty));
    for (const m of M.meterReadings(diagram, vcc, drive, undefined, undefined, moyennePwm)) {
      if (!suivi.has(m.partId)) suivi.set(m.partId, []);
      suivi.get(m.partId).push(m.value);
    }
    if ((suivi.get('M1')?.length ?? 0) >= 40) { clearInterval(t); res(); }
  }, 16);
});
engine.dispose?.();

if (!suivi.has('M1')) { console.log('aucun relevé — série :', JSON.stringify(serie.slice(-300))); process.exit(1); }
console.log(`banc mesure-pico — PWM GP15 : ${FREQ} Hz, ${DUTY} %`);
for (const [id, vals] of suivi) {
  const nums = vals.filter((v) => v !== null && Number.isFinite(v));
  if (nums.length === 0) { console.log(`${id.padEnd(3)} : que des null`); continue; }
  const min = Math.min(...nums), max = Math.max(...nums);
  const moy = nums.reduce((a, b) => a + b, 0) / nums.length;
  const nuls = vals.length - nums.length;
  console.log(`${id.padEnd(3)} min=${min.toFixed(4)}  max=${max.toFixed(4)}  moy=${moy.toFixed(4)}  amplitude=${(max - min).toFixed(4)}${nuls ? `  (${nuls} null)` : ''}`);
}
console.log('M1 image par image :', (suivi.get('M1') ?? []).map((v) => (v === null ? 'null' : v.toFixed(3))).join(' '));
process.exit(0);
