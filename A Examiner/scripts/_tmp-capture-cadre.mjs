// Capture de l'éditeur : ventilo + uno sélectionnés, bandeau affiché, pour voir
// à l'œil où tombent le cadre de sélection et le bandeau de nom.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-capcadre');
const type = process.argv[2] ?? 'ventilo';
const mod = process.argv[3] ?? 'ventilo-element.mjs';

const entry = `
import { Editor } from '../../src/webview/diagram/editor.mjs';
import '../../src/webview/composants/${mod}';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
	const canvas = document.getElementById('canvas');
	const editor = new Editor(canvas, document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	canvas.classList.add('canvas--show-labels', 'canvas--show-ids');
	await wait(50);
	editor.setCamera({ zoom: 1, panX: 0, panY: 0 });
	const p = editor.addPart('${type}', 120, 160);
	await wait(600);
	editor.selectedParts = new Set([p.id]);
	editor.setPartHighlight();
	editor.setCamera({ zoom: 1, panX: 0, panY: 0 });
	// La mesure d'encre est asynchrone : laisser le cache se remplir, puis recaler.
	await wait(1200);
	editor.setPartHighlight();
	await wait(300);
	// Repère : le viewBox du corps en bleu, pour voir le vide autour du dessin.
	const cont = [...document.querySelectorAll('.part')][0];
	const body = cont.querySelector('.part__body');
	const rep = document.createElement('div');
	rep.style.cssText = 'position:absolute;inset:0;outline:1px solid #00a0ff;pointer-events:none';
	body.appendChild(rep);
	await wait(100);
	// Affiche à l'écran ce que valent le cache d'encre et le cadre, pour savoir si
	// le recalage a eu lieu au moment de la capture.
	const sel = body.querySelector('.part__selbox');
	const dbg = document.createElement('div');
	dbg.style.cssText = 'position:fixed;left:4px;top:4px;font:11px monospace;color:#0f0;background:#000;padding:3px;z-index:9999;white-space:pre';
	dbg.textContent = 'encre=' + JSON.stringify(editor.inkBox && editor.inkBox.get('ventilo'))
		+ '\\nselbox=' + (sel ? [sel.offsetLeft, sel.offsetTop, sel.offsetWidth, sel.offsetHeight].join(',') : 'AUCUN')
		+ '\\ncorps=' + body.offsetWidth + 'x' + body.offsetHeight;
	document.body.appendChild(dbg);
	await wait(50);
	document.title = 'pret';
}
run();
`;
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'e.mjs'), entry);
const b = await esbuild({ entryPoints: [join(CACHE, 'e.mjs')], bundle: true, format: 'iife', write: false, loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl' }, absWorkingDir: ROOT });
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
writeFileSync(join(CACHE, 'p.html'),
	`<!doctype html><meta charset=utf8><style>${css}</style><body style="margin:0;background:#1e1e1e">` +
	`<div class="workshop"><aside id="palette" class="palette" style="display:none"></aside>` +
	`<div id="canvas" class="canvas" style="width:600px;height:520px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector" style="display:none"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const out = join(CACHE, `${type}.png`);
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=8000',
	'--window-size=600,520', `--screenshot=${out}`, `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8' });
console.log(out);
