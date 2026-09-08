import esbuild from 'esbuild';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'c:/- VS Code/Extensions/Kablix';
const tmp = mkdtempSync(join(tmpdir(), 'kx-diag-'));
const out = join(tmp, 'model.mjs');
await esbuild.build({ entryPoints: [join(ROOT, 'src/webview/diagram/model.mts')], outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent', loader: { '.svg': 'text', '.webp': 'dataurl' } });
const model = await import(pathToFileURL(out).href);
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const psu = (id) => (id === 'Alim1' ? 5 : null);
for (const duty of [0.75, 1]) {
  for (let i = 0; i < 3; i++) model.setActiveBridges(model.commandedBridges(d, (n) => n === 'GP15', 3.3, psu, undefined, (p) => (p === 'GP15' ? duty : null)));
  const ts = model.transistorStates(d, (n) => n === 'GP15', 3.3, psu);
  for (const t of ts) console.log(`duty ${duty} | ${t.partId} on=${t.on} Ib=${t.baseAmps.toFixed(5)} Icmax=${t.maxCollectorAmps.toFixed(4)} gate=${t.gatePin}`);
  console.log('   ponts :', JSON.stringify(model.activeBridgesSnapshot?.() ?? 'n/a'));
  model.setActiveBridges([]);
}
