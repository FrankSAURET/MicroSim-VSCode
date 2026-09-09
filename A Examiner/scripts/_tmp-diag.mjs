// Diagnostic minimal : le bundle sim.mts démarre-t-il dans le harnais ?
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const CACHE = 'C:/- VS Code/Extensions/Kablix/node_modules/.cache-course';
const html = readFileSync(join(CACHE, 'p.html'), 'utf8')
	.replace('<script src="scenario.js"></script>', '<script src="diag.js"></script>');
writeFileSync(join(CACHE, 'p2.html'), html);
writeFileSync(join(CACHE, 'diag.js'), `
setTimeout(() => {
	const out = document.createElement('pre');
	out.id = 'measures';
	const err = (window.__err || []).join(' ~~ ');
	out.textContent = 'ERREURS[' + (window.__err || []).length + '] ' + err.slice(0, 900);
	document.body.appendChild(out);
}, 2500);
`);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = 'file:///' + join(CACHE, 'p2.html').split(String.fromCharCode(92)).join('/');
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=30000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
console.log(m ? m[1] : 'PAS DE MESURE');
