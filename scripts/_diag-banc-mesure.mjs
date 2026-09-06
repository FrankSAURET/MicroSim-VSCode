// Diagnostic (hors suite) : valeurs attendues du banc de mesure testkablix
// (mesure-uno / mesure-pico). Cinq montages sur une même planche, chacun avec
// ses appareils : transistor, moteur, relais, ventilateur, potentiomètre.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'kablix-banc-'));
const bundle = async (entry, out) => {
  await esbuild.build({
    entryPoints: [join(ROOT, entry)], outfile: join(tmp, out),
    bundle: true, platform: 'node', format: 'esm',
    loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent',
  });
  return import(pathToFileURL(join(tmp, out)).href);
};
const model = await bundle('src/webview/diagram/model.mts', 'model.mjs');

const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
let n = 0;
const W = (a, ap, b, bp) => ({ id: `w${++n}`, a: { partId: a, pin: ap }, b: { partId: b, pin: bp } });

// Le banc est décrit une fois pour les deux cartes : seuls changent la carte,
// les noms de broches et la tension.
const banc = (board, pins, gnd) => {
  n = 0;
  return {
    parts: [
      P('U1', board),
      P('Alim1', 'alim', { voltage: '5', maxcurrent: '2' }),
      // 1. transistor en variateur : moteur + roue libre, voltmètre aux bornes
      P('R1', 'resistor', { value: '1000' }),
      P('T1', 'pn2222a'),
      P('Act1', 'moteur-dc', { voltage: '5', current: '0.1' }),
      P('D1', 'diode', { vf: '0.6' }),
      P('M1', 'multimetre', { mode: 'voltage' }),
      P('M2', 'multimetre', { mode: 'current' }),
      // 2. ventilateur sur l'alim, voltmètre à ses bornes
      P('Act2', 'ventilo', { voltage: '5', current: '0.85' }),
      P('M3', 'multimetre', { mode: 'voltage' }),
      // 3. relais : bobine mesurée au voltmètre
      P('R2', 'resistor', { value: '1000' }),
      P('T2', 'pn2222a'),
      P('Rl1', 'relais', { voltage: '5' }),
      P('D2', 'diode'),
      P('M4', 'multimetre', { mode: 'voltage' }),
      // 4. potentiomètre en pont : voltmètre sur le curseur
      P('Pot1', 'pot', { min: '0', max: '100', value: '50' }),
      P('M5', 'multimetre', { mode: 'voltage' }),
      // 5. oscilloscope sur la commande du variateur
      P('O1', 'oscillo', { voltsdiv: '1', sdiv: '0.001' }),
    ],
    wires: [
      // 1. variateur
      W('R1', '1', 'U1', pins.pwm),
      W('R1', '2', 'T1', 'B'),
      W('T1', 'E', 'U1', gnd[0]),
      W('T1', 'C', 'Act1', '2'),
      W('M2', '+', 'Alim1', 'V+'),
      W('M2', 'GND', 'Act1', '1'),
      W('Alim1', 'GND', 'U1', gnd[1]),
      W('D1', 'K', 'Act1', '1'),
      W('D1', 'A', 'Act1', '2'),
      W('M1', '+', 'Act1', '1'),
      W('M1', 'GND', 'Act1', '2'),
      // 2. ventilateur
      W('Act2', '+', 'Alim1', 'V+'),
      W('Act2', '-', 'Alim1', 'GND'),
      W('M3', '+', 'Act2', '+'),
      W('M3', 'GND', 'Act2', '-'),
      // 3. relais
      W('R2', '1', 'U1', pins.relais),
      W('R2', '2', 'T2', 'B'),
      W('T2', 'E', 'U1', gnd[2]),
      W('T2', 'C', 'Rl1', 'B2'),
      W('Rl1', 'B1', 'U1', pins.vcc),
      W('D2', 'K', 'Rl1', 'B1'),
      W('D2', 'A', 'Rl1', 'B2'),
      W('M4', '+', 'Rl1', 'B1'),
      W('M4', 'GND', 'Rl1', 'B2'),
      // 4. potentiomètre
      W('Pot1', 'VCC', 'Alim1', 'V+'),
      W('Pot1', 'SIG', 'U1', pins.adc),
      W('Pot1', 'GND', 'U1', gnd[3]),
      W('M5', '+', 'Pot1', 'SIG'),
      W('M5', 'GND', 'Pot1', 'GND'),
      // 5. oscilloscope sur la base du variateur
      W('O1', '+', 'T1', 'B'),
      W('O1', 'GND', 'U1', gnd[4]),
    ],
  };
};

const lire = (d, vcc, hautes, duty) => {
  const drive = (p) => (hautes.includes(p) ? 'high' : 'hiz');
  model.setActiveBridges([]);
  for (let i = 0; i < 3; i++) {
    model.setActiveBridges(
      model.commandedBridges(d, (p) => hautes.includes(p), vcc, undefined, undefined,
        (p) => duty[p] ?? null)
    );
  }
  const r = model.meterReadings(d, vcc, drive);
  model.setActiveBridges([]);
  return r;
};

for (const [board, vcc, pins, gnd] of [
  ['uno', 5, { pwm: '9', relais: '8', vcc: '5V', adc: 'A0' },
    ['GND.1', 'GND.2', 'GND.3', 'GND.1', 'GND.2']],
  ['pico', 3.3, { pwm: 'GP15', relais: 'GP14', vcc: '3V3', adc: 'GP26' },
    ['GND.1', 'GND.2', 'GND.3', 'GND.7', 'GND.8']],
]) {
  const d = banc(board, pins, gnd);
  console.log(`\n=== ${board} (${vcc} V) ===`);
  for (const [label, hautes, duty] of [
    ['plein regime (duty 100 %)', [pins.pwm, pins.relais], {}],
    ['demi regime (duty 50 %)', [pins.pwm, pins.relais], { [pins.pwm]: 0.5 }],
    ['tout au repos', [], {}],
  ]) {
    const r = lire(d, vcc, hautes, duty);
    const s = r.map((m) => `${m.partId}=${m.value === null ? 'null'
      : m.mode === 'current' ? (m.value * 1000).toFixed(3) + 'mA' : m.value.toFixed(3) + 'V'}`);
    console.log(`  ${label} : ${s.join('  ')}`);
  }
}
