// Diagnostic (hors suite) : cas NON dipôles — potentiomètre, transistor,
// portes logiques, capteurs à sortie, joystick, sortie PWM d'une carte.
// Chaque essai monte le composant dans le rôle qu'il occupe vraiment et
// interroge un voltmètre.
import esbuild from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-sonde2-'));
const buildTo = async (entry, outfile) => {
  await esbuild.build({
    entryPoints: [join(root, entry)], outfile: join(tmp, outfile),
    bundle: true, platform: 'node', format: 'esm',
    loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent',
  });
  return import(pathToFileURL(join(tmp, outfile)).href);
};
const { meterReadings } = await buildTo('src/webview/diagram/model.mts', 'model.mjs');

const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });
const ALIM = P('psu', 'alim', { voltage: '5', maxcurrent: '1' });
const VM = P('mv', 'multimetre', { mode: 'voltage' });
const lire = (d, vcc = 5, drive, pwm) =>
  meterReadings(d, vcc, drive, undefined, undefined, pwm).find((m) => m.partId === 'mv')?.value ?? null;
const dire = (label, v) => console.log(`${label} → ${v === null ? '— (rien à mesurer)' : v.toFixed(3) + ' V'}`);

// 1. Potentiomètre en pont diviseur : curseur à mi-course, attendu 2,5 V.
dire('potentiomètre (curseur SIG, 50 %)', lire({
  parts: [ALIM, P('pot', 'pot', { value: '50' }), VM],
  wires: [
    W('a', pin('psu', 'V+'), pin('pot', 'VCC')),
    W('b', pin('pot', 'GND'), pin('psu', 'GND')),
    W('c', pin('pot', 'SIG'), pin('mv', '+')),
    W('d', pin('psu', 'GND'), pin('mv', 'GND')),
  ],
}));

// 2. Joystick : sortie VERT au repos, attendu ~2,5 V.
dire('joystick (sortie VERT au repos)', lire({
  parts: [ALIM, P('joy', 'joystick'), VM],
  wires: [
    W('a', pin('psu', 'V+'), pin('joy', 'VCC')),
    W('b', pin('joy', 'GND'), pin('psu', 'GND')),
    W('c', pin('joy', 'VERT'), pin('mv', '+')),
    W('d', pin('psu', 'GND'), pin('mv', 'GND')),
  ],
}));

// 3. Capteur de lumière (ao-do-sensor) : sortie AO.
dire('capteur de lumière (sortie AO)', lire({
  parts: [ALIM, P('ls', 'photoresistor'), VM],
  wires: [
    W('a', pin('psu', 'V+'), pin('ls', 'VCC')),
    W('b', pin('ls', 'GND'), pin('psu', 'GND')),
    W('c', pin('ls', 'AO'), pin('mv', '+')),
    W('d', pin('psu', 'GND'), pin('mv', 'GND')),
  ],
}));

// 4. Capteur de température NTC (analog-source) : sortie AOUT.
dire('capteur NTC module (sortie AOUT)', lire({
  parts: [ALIM, P('t', 'ntc-temp', { temperature: '25' }), VM],
  wires: [
    W('a', pin('psu', 'V+'), pin('t', 'VCC')),
    W('b', pin('t', 'GND'), pin('psu', 'GND')),
    W('c', pin('t', 'AOUT'), pin('mv', '+')),
    W('d', pin('psu', 'GND'), pin('mv', 'GND')),
  ],
}));

// 5. Broche numérique d'une carte, forcée HAUTE / hachée à 50 %.
const mcuDiag = {
  parts: [P('uno', 'uno'), VM],
  wires: [W('a', pin('uno', '13'), pin('mv', '+')), W('b', pin('uno', 'GND.1'), pin('mv', 'GND'))],
};
dire('broche D13 forcée HAUTE', lire(mcuDiag, 5, (p) => (p === '13' ? 'high' : 'hiz')));
dire('broche D13 en PWM 50 %', lire(mcuDiag, 5, (p) => (p === '13' ? 'high' : 'hiz'), (p) => (p === '13' ? 2.5 : null)));

// 6. Transistor NPN saturé : le pont C→E est posé par la simulation
//    (commandedBridges). On le pose ici à la main pour vérifier que le
//    voltmètre voit bien le Vce et pas un court-circuit.
const m2 = await buildTo('src/webview/diagram/model.mts', 'model2.mjs');
m2.setActiveBridges([{ partId: 'q', a: '2', b: '3', drop: 0.2, limitAmps: 1, oneWay: true }]);
const vceDiag = {
  parts: [ALIM, P('q', 'pn2222a'), P('rl', 'resistor', { value: '1000' }), VM],
  wires: [
    W('a', pin('psu', 'V+'), pin('rl', '1')),
    W('b', pin('rl', '2'), pin('q', '2')),
    W('c', pin('q', '3'), pin('psu', 'GND')),
    W('d', pin('q', '2'), pin('mv', '+')),
    W('e', pin('q', '3'), pin('mv', 'GND')),
  ],
};
const vce = m2.meterReadings(vceDiag, 5).find((m) => m.partId === 'mv')?.value ?? null;
dire('transistor NPN saturé (Vce aux bornes C-E)', vce);
