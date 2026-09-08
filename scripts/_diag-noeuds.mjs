// Tension de chaque nœud du banc transistor, vue par theveninNode.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-dn-'));
const out = join(tmp, 'model.mjs');
await esbuild.build({ entryPoints: [join(root, 'src/webview/diagram/model.mts')], outfile: out,
  bundle: true, platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
let src = readFileSync(out, 'utf8');
src += '\nexport { theveninNode as _tn, circuitSources as _cs, computeResistiveGraph as _rg };\n';
const out2 = join(tmp, 'model2.mjs');
writeFileSync(out2, src);
const M = await import(pathToFileURL(out2).href);
const P = (id, type, attrs) => ({ id, type, x: 0, y: 0, attrs: attrs ?? {} });
const W = (id, a, b) => ({ id, a, b });
const pin = (partId, p) => ({ partId, pin: p });
const NPN = { pkg: 'to92', symbol: 'npn', named: '1', e: '1', b: '2', c: '3', gain: '100', vcemax: '40', icmax: '0.6' };
const d = {
  parts: [P('uno','uno'), P('psu','alim',{voltage:'5',maxcurrent:'1'}),
    P('r1','resistor',{value:'100'}), P('rb','resistor',{value:'1000'}),
    P('q1','transistor',{...NPN, vcesat:'0.2'}), P('mv','multimetre',{mode:'voltage'})],
  wires: [W('w1',pin('psu','V+'),pin('r1','1')), W('w2',pin('r1','2'),pin('q1','C')),
    W('w3',pin('q1','E'),pin('psu','GND')),
    W('w4',pin('uno','8'),pin('rb','1')), W('w5',pin('rb','2'),pin('q1','B')),
    W('w6',pin('q1','C'),pin('mv','+')), W('w7',pin('q1','E'),pin('mv','GND'))],
};
M.setActiveBridges(M.commandedBridges(d, (n) => String(n) === '8', 5));
const g = M._rg(d);
const { sources } = M._cs(d, 5, g.nets, g.vccNets, g.gndNets, (n) => (String(n) === '8' ? 'high' : 'low'));
const sn = new Set(sources.map((s) => s.net));
console.log('rails vcc :', [...g.vccNets], ' gnd :', [...g.gndNets]);
for (const [p, pp] of [['q1','C'],['q1','E'],['psu','V+'],['psu','GND'],['r1','1'],['r1','2']]) {
  const net = g.nets.netOf({ partId: p, pin: pp });
  const th = M._tn(net, sources, sn, g.adj);
  console.log(`${p}.${pp}`.padEnd(9), net.padEnd(12), th ? `${th.volts.toFixed(5)} V  (Rth ${th.ohms.toFixed(3)} Ω)` : 'en l\'air');
}
