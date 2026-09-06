// Diag : moteur / ventilo / résistance pilotés en PWM par une broche MCU.
// Le voltmètre doit lire la MOYENNE (duty x Vcc), pas 0 ou 5 V.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../../../- VS Code/Extensions/Kablix/', import.meta.url));
const ROOT = 'c:/- VS Code/Extensions/Kablix/';
const tmp = mkdtempSync(join(tmpdir(), 'kablix-pwm-'));
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
const W = (id, a, b) => ({ id, a, b });
const pn = (partId, pin) => ({ partId, pin });

// Carte Uno, broche 9 (PWM) → charge → GND. Voltmètre aux bornes, ampèremètre en série.
const banc = (type, bornes, attrs) => ({
  parts: [
    P('uno', 'uno'),
    P('dut', type, attrs),
    P('mv', 'multimetre', { mode: 'voltage' }),
    P('ma', 'multimetre', { mode: 'current' }),
  ],
  wires: [
    W('w1', pn('uno', '9'), pn('dut', bornes[0])),
    W('w2', pn('dut', bornes[1]), pn('ma', '+')),
    W('w3', pn('ma', 'GND'), pn('uno', 'GND.1')),
    W('w4', pn('dut', bornes[0]), pn('mv', '+')),
    W('w5', pn('dut', bornes[1]), pn('mv', 'GND')),
  ],
});

const duty = 0.5;
const drive = () => 'high';
const pwm = (pin) => (pin === '9' ? duty * 5 : null);

const cas = [
  ['resistor', ['1', '2'], { value: '1000' }],
  ['moteur-dc', ['1', '2'], { voltage: '5', current: '0.2' }],
  ['ventilo', ['+', '-'], { voltage: '5', current: '0.85' }],
];
console.log('type | U (V) | I (mA)');
for (const [type, b, attrs] of cas) {
  const d = banc(type, b, attrs);
  const r = model.meterReadings(d, 5, drive, undefined, undefined, pwm);
  const u = r.find((x) => x.partId === 'mv')?.value;
  const i = r.find((x) => x.partId === 'ma')?.value;
  console.log([type, u == null ? '—' : u.toFixed(3), i == null ? '—' : (i * 1000).toFixed(3)].join(' | '));
}

// --- Montage réaliste : PWM sur la base d'un transistor, moteur sur 5 V ------
{
  const d = {
    parts: [
      P('uno', 'uno'),
      P('q', 'npn', {}),
      P('rb', 'resistor', { value: '1000' }),
      P('dut', 'moteur-dc', { voltage: '5', current: '0.2' }),
      P('mv', 'multimetre', { mode: 'voltage' }),
    ],
    wires: [
      W('w1', pn('uno', '9'), pn('rb', '1')),
      W('w2', pn('rb', '2'), pn('q', '2')),
      W('w3', pn('uno', '5V'), pn('dut', '1')),
      W('w4', pn('dut', '2'), pn('q', '3')),
      W('w5', pn('q', '1'), pn('uno', 'GND.1')),
      W('w6', pn('dut', '1'), pn('mv', '+')),
      W('w7', pn('dut', '2'), pn('mv', 'GND')),
    ],
  };
  for (const dc of [0, 0.25, 0.5, 0.75, 1]) {
    const r = model.meterReadings(d, 5, () => 'high', undefined, undefined,
      (p) => (p === '9' ? dc * 5 : null));
    const u = r.find((x) => x.partId === 'mv')?.value;
    console.log(`transistor duty=${dc} → U moteur = ${u == null ? '—' : u.toFixed(3)} V`);
  }
}

// --- Même montage, mais avec les ponts commandés posés (point fixe) ----------
{
  const d = {
    parts: [
      P('uno', 'uno'),
      P('q', 'npn', {}),
      P('rb', 'resistor', { value: '1000' }),
      P('dut', 'moteur-dc', { voltage: '5', current: '0.2' }),
      P('mv', 'multimetre', { mode: 'voltage' }),
    ],
    wires: [
      W('w1', pn('uno', '9'), pn('rb', '1')),
      W('w2', pn('rb', '2'), pn('q', '2')),
      W('w3', pn('uno', '5V'), pn('dut', '1')),
      W('w4', pn('dut', '2'), pn('q', '3')),
      W('w5', pn('q', '1'), pn('uno', 'GND.1')),
      W('w6', pn('dut', '1'), pn('mv', '+')),
      W('w7', pn('dut', '2'), pn('mv', 'GND')),
    ],
  };
  for (const dc of [0, 0.25, 0.5, 1]) {
    const readPin = (n) => n === '9';   // en PWM la broche est vue HAUTE
    for (let i = 0; i < 3; i++) model.setActiveBridges(model.commandedBridges(d, readPin, 5, undefined, undefined, (p) => (p === '9' ? dc : null)));
    const r = model.meterReadings(d, 5, (p) => (p === '9' ? 'high' : 'hiz'), undefined, undefined,
      (p) => (p === '9' ? dc * 5 : null));
    const u = r.find((x) => x.partId === 'mv')?.value;
    console.log(`transistor+ponts duty=${dc} → U moteur = ${u == null ? '—' : u.toFixed(3)} V`);
  }
  model.setActiveBridges([]);
}

// --- Que voit motorStates / motorMcuPin dans le montage à transistor ? ------
{
  const d = {
    parts: [
      P('uno', 'uno'),
      P('q', 'npn', {}),
      P('rb', 'resistor', { value: '1000' }),
      P('dut', 'moteur-dc', { voltage: '5', current: '0.2' }),
      P('d1', 'diode', {}),
    ],
    wires: [
      W('w1', pn('uno', '9'), pn('rb', '1')),
      W('w2', pn('rb', '2'), pn('q', '2')),
      W('w3', pn('uno', '5V'), pn('dut', '1')),
      W('w4', pn('dut', '2'), pn('q', '3')),
      W('w5', pn('q', '1'), pn('uno', 'GND.1')),
      // roue libre : cathode au +, anode au collecteur
      W('w6', pn('dut', '1'), pn('d1', 'K')),
      W('w7', pn('dut', '2'), pn('d1', 'A')),
    ],
  };
  console.log('motorMcuPin =', model.motorMcuPin(d, 'dut', 5));
  for (const dc of [0, 0.25, 0.5, 0.75, 1]) {
    for (let i = 0; i < 3; i++)
      model.setActiveBridges(model.commandedBridges(d, (n) => n === '9', 5, undefined, undefined, (p) => (p === '9' ? dc : null)));
    const st = model.motorStates(d, 5, (p) => (p === '9' ? dc : 1))[0];
    console.log(`  duty=${dc} → volts=${st.volts.toFixed(3)} speed=${(st.speed*100).toFixed(0)}%`);
  }
  model.setActiveBridges([]);
}

// --- Détail : ce que lit un voltmètre sur CHAQUE nœud du montage transistor --
{
  const d = {
    parts: [
      P('uno', 'uno'),
      P('q', 'npn', {}),
      P('rb', 'resistor', { value: '1000' }),
      P('dut', 'moteur-dc', { voltage: '5', current: '0.2' }),
      P('mhaut', 'multimetre', { mode: 'voltage' }),
      P('mbas', 'multimetre', { mode: 'voltage' }),
    ],
    wires: [
      W('w1', pn('uno', '9'), pn('rb', '1')),
      W('w2', pn('rb', '2'), pn('q', '2')),
      W('w3', pn('uno', '5V'), pn('dut', '1')),
      W('w4', pn('dut', '2'), pn('q', '3')),
      W('w5', pn('q', '1'), pn('uno', 'GND.1')),
      // haut du moteur / masse
      W('w6', pn('dut', '1'), pn('mhaut', '+')),
      W('w7', pn('mhaut', 'GND'), pn('uno', 'GND.2')),
      // collecteur / masse
      W('w8', pn('dut', '2'), pn('mbas', '+')),
      W('w9', pn('mbas', 'GND'), pn('uno', 'GND.3')),
    ],
  };
  for (const dc of [0, 0.25, 0.5, 0.75, 1]) {
    for (let i = 0; i < 3; i++)
      model.setActiveBridges(model.commandedBridges(d, (n) => n === '9', 5, undefined, undefined, (p) => (p === '9' ? dc : null)));
    const r = model.meterReadings(d, 5, (p) => (p === '9' ? 'high' : 'hiz'), undefined, undefined,
      (p) => (p === '9' ? dc * 5 : null));
    const h = r.find((x) => x.partId === 'mhaut')?.value;
    const b = r.find((x) => x.partId === 'mbas')?.value;
    console.log(`duty=${dc} : haut=${h?.toFixed(3)} V  collecteur=${b?.toFixed(3)} V  Umoteur=${(h-b).toFixed(3)} V`);
  }
  model.setActiveBridges([]);
}
