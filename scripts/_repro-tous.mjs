import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-tous-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
  return import(pathToFileURL(join(tmp, o)).href);
};
const M = await b('src/webview/diagram/model.mts', 'model.mjs');
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = Number(process.argv[3]);
const [pwmPin, relais, mos] = process.argv.slice(4);
const duty = 0.5;
const hautes = new Set([pwmPin, relais, mos]);
M.setActiveBridges(M.commandedBridges(d, (p) => hautes.has(p), vcc, undefined, undefined, (p) => (p === pwmPin ? duty : null)));
const r = M.meterReadings(d, vcc, (p) => (hautes.has(p) ? 'high' : 'hiz'), undefined, undefined, (p) => (p === pwmPin ? duty * vcc : null));
for (const m of r) console.log(`        { partId: '${m.partId}', mode: '${m.mode}', value: ${Number(m.value.toFixed(m.mode === 'current' ? 6 : 3))}, tol: ${m.mode === 'current' ? 0.002 : 0.02} },`);
