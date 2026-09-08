// Reproduction des anomalies du banc mesure-pico (item 1 du todo).
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-repro-'));
const buildTo = async (entry, outfile) => {
  await esbuild.build({
    entryPoints: [join(root, entry)], outfile: join(tmp, outfile), bundle: true,
    platform: 'node', format: 'esm',
    loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent',
  });
  return import(pathToFileURL(join(tmp, outfile)).href);
};
const M = await buildTo('src/webview/diagram/model.mts', 'model.mjs');

const diagram = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = 3.3;
const hautes = new Set((process.argv[3] ?? 'GP15,GP14').split(',').filter(Boolean));
const drive = (pin) => (hautes.has(pin) ? 'high' : 'hiz');
const readPin = (pin) => hautes.has(pin);

M.setActiveBridges(M.commandedBridges(diagram, readPin, vcc));
const r = M.meterReadings(diagram, vcc, drive);
for (const m of r) console.log(m.partId.padEnd(4), m.mode.padEnd(8), m.value === null ? 'null' : m.value.toFixed(4), m.fault);
