// Ce que theveninNode voit sur chaque net d'intérêt.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-src-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' },
    logLevel: 'silent', sourcemap: false });
  return join(tmp, o);
};
const f = await b('src/webview/diagram/model.mts', 'model.mjs');
// On instrumente le bundle : exposer circuitSources/resistiveGraph via un patch texte.
import { writeFileSync } from 'node:fs';
let src = readFileSync(f, 'utf8');
src += '\nexport { circuitSources as _cs, computeResistiveGraph as _rg };\n';
const f2 = f.replace('.mjs', '2.mjs');
writeFileSync(f2, src);
const M = await import(pathToFileURL(f2).href);
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vcc = 3.3;
const hautes = new Set(['GP15', 'GP14']);
M.setActiveBridges(M.commandedBridges(d, (p) => hautes.has(p), vcc));
const g = M._rg(d);
console.log('vccNets:', [...g.vccNets]);
console.log('gndNets:', [...g.gndNets]);
const { sources } = M._cs(d, vcc, g.nets, g.vccNets, g.gndNets, (p) => (hautes.has(p) ? 'high' : 'hiz'));
for (const s of sources) console.log('  source', s.net.padEnd(14), s.volts, 'V', s.ohms, 'Ω');
