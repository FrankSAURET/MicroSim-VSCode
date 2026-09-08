// M1/M2 du variateur : le rapport cyclique doit rester exactement proportionnel.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-m2-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
  return import(pathToFileURL(join(tmp, o)).href);
};
const M = await b('src/webview/diagram/model.mts', 'model.mjs');
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = Number(process.argv[3]);
const pinPwm = process.argv[4], pinRelais = process.argv[5], pinMos = process.argv[6];
const hautes = new Set([pinPwm, pinRelais, pinMos]);
for (const duty of [0, 0.25, 0.5, 0.75, 1]) {
  const dutyFn = (p) => (p === pinPwm ? duty : null);
  M.setActiveBridges(M.commandedBridges(d, (p) => hautes.has(p), vcc, undefined, undefined, dutyFn));
  const pwmV = (p) => (p === pinPwm ? duty * vcc : null);
  const r = M.meterReadings(d, vcc, (p) => (hautes.has(p) ? 'high' : 'hiz'), undefined, undefined, pwmV);
  const g = (id) => { const m = r.find((x) => x.partId === id); return m?.value ?? null; };
  console.log(`duty ${String(duty * 100).padStart(3)} %  M1=${g('M1').toFixed(4)} V  M2=${(g('M2') * 1000).toFixed(3)} mA  O1=${g('O1').toFixed(4)} V  M8=${g('M8').toFixed(4)} V`);
}
