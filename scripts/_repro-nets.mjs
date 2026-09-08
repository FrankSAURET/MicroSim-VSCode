// Quels nets sont classés rails, et quelle tension leur donne circuitSources.
import esbuild from 'esbuild';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'kablix-nets-'));
const b = async (e, o) => {
  await esbuild.build({ entryPoints: [join(root, e)], outfile: join(tmp, o), bundle: true,
    platform: 'node', format: 'esm', loader: { '.svg': 'text', '.webp': 'dataurl' }, logLevel: 'silent' });
  return import(pathToFileURL(join(tmp, o)).href);
};
const M = await b('src/webview/diagram/model.mts', 'model.mjs');
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const nets = M.buildNets(d, false);
const où = (p, pin) => nets.netOf({ partId: p, pin });
for (const [p, pin] of [['U1','3V3'],['U1','VBUS'],['U1','VSYS'],['U1','GND.1'],['Alim1','V+'],['Alim1','GND'],['Rl1','B1'],['T2','C'],['T2','E'],['Act2','+'],['Act2','-'],['Pot1','SIG'],['Pot1','GND'],['Pot1','VCC']])
  console.log(`${p}.${pin}`.padEnd(12), où(p, pin));
