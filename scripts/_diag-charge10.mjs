import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build as esbuild } from 'esbuild';
const ROOT = process.cwd();
const CACHE = join(ROOT, 'node_modules', '.cache', 'd10');
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'm.mjs'), `export * from '../../../src/webview/diagram/model.mjs';\n`);
const out = join(CACHE, 'm.bundle.mjs');
await esbuild({ entryPoints: [join(CACHE, 'm.mjs')], outfile: out, bundle: true, platform: 'node',
  format: 'esm', logLevel: 'silent', loader: { '.svg': 'text', '.webp': 'dataurl' }, absWorkingDir: ROOT });
const M = await import(pathToFileURL(out).href);
const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });
const NPN = { pkg:'to92', symbol:'npn', named:'1', e:'1', b:'2', c:'3', gain:'100', vcemax:'40', icmax:'0.6', vcesat:'0.2' };
const banc = (charge) => ({
  parts: [P('uno','uno'), P('psu','alim',{voltage:'5',maxcurrent:'1'}), P('r1','resistor',{value:charge}),
    P('rb','resistor',{value:'1000'}), P('q1','transistor',NPN), P('mv','multimetre',{mode:'voltage'})],
  wires: [W('w1',pin('psu','V+'),pin('r1','1')), W('w2',pin('r1','2'),pin('q1','C')),
    W('w3',pin('q1','E'),pin('psu','GND')), W('w4',pin('uno','8'),pin('rb','1')),
    W('w5',pin('rb','2'),pin('q1','B')), W('w6',pin('q1','C'),pin('mv','+')), W('w7',pin('q1','E'),pin('mv','GND'))],
});
for (const charge of ['100','10']) {
  const d = banc(charge);
  const readPin = (n) => String(n) === '8';
  const ponts = M.commandedBridges(d, readPin, 5);
  console.log(`charge ${charge} Ω  ponts:`, JSON.stringify(ponts));
  M.setActiveBridges(ponts);
  const v = M.meterReadings(d, 5, (n)=>String(n)==='8'?'high':'low').find(x=>x.partId==='mv')?.value;
  M.setActiveBridges([]);
  console.log(`   lecture = ${v} V   (attendu 0.2)`);
}
