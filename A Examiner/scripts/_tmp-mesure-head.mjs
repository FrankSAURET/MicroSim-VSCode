// Mesure hors interface : écart entre le BAS du bandeau (part__head) et le HAUT
// du dessin réel (getBBox), pour chaque composant cité par Frank + témoins.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'c:/- VS Code/Extensions/Kablix';
const CACHE = join(ROOT, 'node_modules', '.cache-mesurehead');
import { build as esbuild } from 'esbuild';

const entry = `
import { Editor } from '../../src/webview/diagram/editor.mjs';
import '../../src/webview/composants/ventilo-element.mjs';
import '../../src/webview/composants/arduino-uno-element.mjs';
import '../../src/webview/composants/led-element.mjs';
import '../../src/webview/composants/resistor-element.mjs';
import '../../src/webview/composants/servo-element.mjs';
import '../../src/webview/composants/multimetre-element.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
	const canvas = document.getElementById('canvas');
	const editor = new Editor(canvas, document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	canvas.classList.add('canvas--show-labels', 'canvas--show-ids');
	await wait(50);
	const rows = [];
	const types = ['ventilo', 'uno', 'led', 'resistor', 'servo', 'multimetre'];
	let x = 100;
	for (const type of types) {
		const p = editor.addPart(type, x, 400);
		x += 400;
		await wait(400);
		editor.selectPart?.(p.id);
		const cont = [...document.querySelectorAll('.part')]
			.find((c) => (c.querySelector('.part__id')?.textContent ?? '') === p.id);
		const body = cont.querySelector('.part__body');
		const head = cont.querySelector('.part__head');
		const el = cont.querySelector(':scope > .part__body > *');
		let bb = null, vb = null, vw = 0, vh = 0;
		try {
			const svgs = [...(el.shadowRoot ?? el).querySelectorAll('svg')].filter((s) => !s.parentElement?.closest('svg'));
			const svg = svgs.reduce((best, s) => {
				const a = (s.width?.baseVal?.value || 0) * (s.height?.baseVal?.value || 0);
				const ba = best ? (best.width?.baseVal?.value || 0) * (best.height?.baseVal?.value || 0) : -1;
				return a > ba ? s : best;
			}, null);
			const b = svg?.getBBox();
			vw = svg?.width?.baseVal?.value || 0;
			vh = svg?.height?.baseVal?.value || 0;
			const v = svg?.viewBox?.baseVal;
			if (b) { bb = { x: b.x, y: b.y, w: b.width, h: b.height }; vb = v ? { x: v.x, y: v.y, w: v.width, h: v.height } : null; }
		} catch (e) { bb = 'ERR ' + e.message; }
		const rb = body.getBoundingClientRect();
		const rh = head.getBoundingClientRect();
		// Haut du dessin, en px du corps
		let dessinTop = null;
		if (bb && vb && vb.h) dessinTop = (bb.y - vb.y) * (vh / vb.h);
		rows.push({ type, corpsH: rb.height.toFixed(1), viewBox: vb, bbox: bb, vw, vh,
			dessinTopPx: dessinTop === null ? null : dessinTop.toFixed(1),
			ecartHeadDessin: dessinTop === null ? null : (rb.top - rh.bottom + dessinTop).toFixed(1) });
	}
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(rows, null, 1);
	document.body.appendChild(out);
}
run().catch((e) => {
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify([{ err: String(e && e.stack) }]);
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
	`<div id="canvas" class="canvas" style="width:1800px;height:1200px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=40000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : 'INTROUVABLE');
