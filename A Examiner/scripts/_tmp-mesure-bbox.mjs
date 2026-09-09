// Que contient la bbox du ventilo ? Liste les enfants de premier niveau du SVG
// avec leur bbox, pour trouver ce qui déborde du boîtier.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-bbox');

const entry = `
import { Editor } from '../../src/webview/diagram/editor.mjs';
import '../../src/webview/composants/ventilo-element.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
	const canvas = document.getElementById('canvas');
	const editor = new Editor(canvas, document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	await wait(50);
	const p = editor.addPart('ventilo', 120, 160);
	await wait(700);
	const cont = [...document.querySelectorAll('.part')][0];
	const el = cont.querySelector('kablix-ventilo');
	const svg = (el.shadowRoot ?? el).querySelector('svg');
	const rows = [];
	const bb = svg.getBBox();
	rows.push({ quoi: 'SVG entier', x: +bb.x.toFixed(2), y: +bb.y.toFixed(2), w: +bb.width.toFixed(2), h: +bb.height.toFixed(2) });
	// Tout ce qui touche le HAUT du dessin (y < 20 dans le repere ecran du svg),
	// avec son style calcule : on cherche les traces invisibles qui gonflent la bbox.
	const feuilles = [];
	const collect = (node) => {
		for (const c of node.children) {
			if (c.children.length) { collect(c); continue; }
			let b = null;
			try { b = c.getBoundingClientRect(); } catch {}
			if (b && b.width > 0) feuilles.push([c, b]);
		}
	};
	collect(svg);
	const sr = svg.getBoundingClientRect();
	feuilles.sort((a, x) => a[1].top - x[1].top);
	for (const [c, b] of feuilles.slice(0, 12)) {
		const st = getComputedStyle(c);
		rows.push({ quoi: c.tagName + '#' + (c.id || '?') + ' fill=' + st.fill.slice(0, 22)
			+ ' stroke=' + st.stroke.slice(0, 16) + ' op=' + st.opacity + ' fo=' + st.fillOpacity + ' disp=' + st.display,
			x: +((b.left - sr.left) / (sr.width / 230)).toFixed(2), y: +((b.top - sr.top) / (sr.height / 220)).toFixed(2),
			w: +(b.width / (sr.width / 230)).toFixed(2), h: +(b.height / (sr.height / 220)).toFixed(2) });
	}
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(rows, null, 0);
	document.body.appendChild(out);
}
run().catch((e) => { const o = document.createElement('pre'); o.id = 'measures'; o.textContent = JSON.stringify([{ err: String(e && e.stack) }]); document.body.appendChild(o); });
`;
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'e.mjs'), entry);
const b = await esbuild({ entryPoints: [join(CACHE, 'e.mjs')], bundle: true, format: 'iife', write: false, loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl' }, absWorkingDir: ROOT });
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
writeFileSync(join(CACHE, 'p.html'),
	`<!doctype html><meta charset=utf8><style>${css}</style><body style="margin:0">` +
	`<div class="workshop"><aside id="palette" class="palette"></aside>` +
	`<div id="canvas" class="canvas" style="width:900px;height:700px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=20000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
const rows = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
for (const r of rows) console.log(String(r.quoi ?? r.err).padEnd(44), 'x', String(r.x).padStart(8), 'y', String(r.y).padStart(8), 'w', String(r.w).padStart(8), 'h', String(r.h).padStart(8));
