// Repro (hors suite) : M1 instable à 1 kHz sur le banc mesure-pico.
// Fait tourner le VRAI PicoEngine avec un PWM matériel à 1 kHz et relève le
// rapport cyclique vu par sim.mts (pulseActive + readPwmDuty) au rythme du
// rendu (~16 ms), comme le fait la boucle d'images.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { firmwarePico } from './_firmware.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-m1-'));
const load = async (entry, name) => {
  const out = join(tmp, name);
  await esbuild.build({ entryPoints: [join(root, entry)], outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};

const fw = firmwarePico();
if (!fw) { console.log('firmware absent'); process.exit(1); }
const { parseUf2 } = await load('src/shared/uf2.ts', 'uf2.mjs');
const { PicoEngine } = await load('src/webview/engines/pico.mts', 'pico.mjs');
const segments = parseUf2(new Uint8Array(readFileSync(fw))).map((s) => ({ addr: s.addr, data: s.data }));

const FREQ = Number(process.argv[2] ?? 1000);
const DUTY = Number(process.argv[3] ?? 50);
const script = `from machine import Pin, PWM
import time
v = PWM(Pin(15))
v.freq(${FREQ})
v.duty_u16(${DUTY} * 65535 // 100)
print("pret")
while True:
    time.sleep_ms(200)
`;

const engine = new PicoEngine({ kind: 'flash', segments, script });
engine.setPulseMonitors(['GP15']);
let pret = false;
let serie = '';
engine.onSerial = (c) => { serie += c; if (serie.includes('pret')) pret = true; };
engine.start();

const relevés = [];
await new Promise((res) => {
  const t0 = Date.now();
  const t = setInterval(() => {
    if (Date.now() - t0 > 30000) { clearInterval(t); res(); return; }
    if (!pret) return;
    const d = engine.pulseActive('GP15') ? engine.readPwmDuty('GP15') : (engine.readDigital('GP15') ? 1 : 0);
    relevés.push(d);
    if (relevés.length >= 60) { clearInterval(t); res(); }
  }, 16);
});
engine.dispose?.();

if (relevés.length === 0) {
  console.log('AUCUN RELEVE — le script n a pas imprime "pret". Serie recue :');
  console.log(JSON.stringify(serie.slice(-400)));
  process.exit(1);
}
const min = Math.min(...relevés), max = Math.max(...relevés);
const moy = relevés.reduce((a, b) => a + b, 0) / relevés.length;
console.log(`freq=${FREQ} Hz  duty demandé=${DUTY} %`);
console.log(`min=${(min * 100).toFixed(2)} %  max=${(max * 100).toFixed(2)} %  moy=${(moy * 100).toFixed(2)} %  amplitude=${((max - min) * 100).toFixed(2)} pt`);
console.log(relevés.map((v) => (v * 100).toFixed(1)).join(' '));
process.exit(0);
