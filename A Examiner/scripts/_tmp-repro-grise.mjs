// Repro item 1 : ouvrir mesure-pico.projix laisse une feuille grise.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { build as esbuild } from 'esbuild';

const ROOT = 'C:/- VS Code/Extensions/Kablix';
const CACHE = join(ROOT, 'node_modules', '.cache-grise');
const SRC = readFileSync(join(ROOT, 'src/webview/sim.mts'), 'utf8');
const imports = SRC.split('\n').filter((l) => l.startsWith("import './composants/"))
	.map((l) => l.replace("'./composants/", "'../../src/webview/composants/")).join('\n');
const diagram = readFileSync(process.argv[2], 'utf8');

const entry = `
${imports}
import { Editor } from '../../src/webview/diagram/editor.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DIAG = ${diagram};
const logs = [];
const origErr = console.error;
console.error = (...a) => { logs.push('ERR ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => logs.push('WINERR ' + e.message + ' @ ' + e.filename + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => logs.push('REJ ' + (e.reason && e.reason.message || e.reason)));

async function run() {
	const canvas = document.getElementById('canvas');
	const editor = new Editor(canvas, document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	await wait(50);
	let phase = 'avant';
	try {
		editor.loadCustomParts(DIAG.customParts || []);
		phase = 'customParts ok';
		editor.loadDiagram(DIAG);
		phase = 'loadDiagram ok';
	} catch (e) {
		logs.push('THROW pendant ' + phase + ' : ' + e.message + ' | ' + String(e.stack).slice(0, 400));
	}
	await wait(600);
	try { editor.fitView(); } catch (e) { logs.push('THROW fitView : ' + e.message); }
	await wait(600);
	const conts = [...document.querySelectorAll('.part')];
	const wires = [...document.querySelectorAll('#wires *')];
	const res = {
		phase,
		partsModele: editor.diagram.parts.length,
		partsDom: conts.length,
		wiresModele: editor.diagram.wires.length,
		wiresDom: wires.length,
		corpsVides: conts.filter((c) => {
			const b = c.querySelector('.part__body');
			return !b || b.offsetWidth < 2 || b.offsetHeight < 2;
		}).map((c) => (c.querySelector('.part__id')?.textContent) || '?'),
		logs,
	};
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(res);
	document.body.appendChild(out);
}
run().catch((e) => {
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify({ fatal: e.message, stack: String(e.stack).slice(0, 600), logs });
	document.body.appendChild(out);
});
`;
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'e.mjs'), entry);
const b = await esbuild({ entryPoints: [join(CACHE, 'e.mjs')], bundle: true, format: 'iife', write: false, loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl' }, absWorkingDir: ROOT });
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
writeFileSync(join(CACHE, 'p.html'),
	`<!doctype html><meta charset=utf8><style>${css}</style><body style="margin:0">` +
	`<div class="workshop"><aside id="palette" class="palette"></aside>` +
	`<div id="canvas" class="canvas" style="width:1200px;height:900px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const url = 'file:///' + join(CACHE, 'p.html').split(String.fromCharCode(92)).join('/');
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=40000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) { console.log('MESURES INTROUVABLES'); console.log(dom.slice(0, 2000)); process.exit(1); }
console.log(JSON.stringify(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')), null, 2));
