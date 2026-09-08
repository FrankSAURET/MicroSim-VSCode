// Balayage du potentiomètre du banc : la tension du curseur doit rester dans [0;5].
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-pot-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
  return import(pathToFileURL(join(tmp, o)).href);
};
const M = await b('src/webview/diagram/model.mts', 'model.mjs');
const base = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = 3.3;
const hautes = new Set(['GP15', 'GP14']);
for (const v of [0, 25, 50, 75, 100]) {
  const d = { ...base, parts: base.parts.map((p) => (p.id === 'Pot1' ? { ...p, attrs: { ...p.attrs, value: String(v) } } : p)) };
  M.setActiveBridges(M.commandedBridges(d, (p) => hautes.has(p), vcc));
  const m5 = M.meterReadings(d, vcc, (p) => (hautes.has(p) ? 'high' : 'hiz')).find((m) => m.partId === 'M5');
  console.log(`pot ${String(v).padStart(3)} %  ->  M5 = ${m5.value.toFixed(4)} V`);
}
