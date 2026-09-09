// Reproduction du montage de Frank (mesure-uno, item 5) : LED L1 + R4 220 Ω sur
// le drain d'un IRF530 (T4) dont la GRILLE est attaquée par le CURSEUR du
// potentiomètre Pot1, câblé entre 5 V et la masse. Attendu : la LED s'allume dès
// que le curseur dépasse Vgs(th) = 3,5 V, soit 70 % de course.
//
// Un voltmètre est posé sur le curseur (comme M5 du vrai schéma) : si LUI lit
// juste et que `gateVolts` diverge, le défaut est dans le calcul de grille et
// non dans le pont diviseur.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-mospot');

const entry = `
import { Editor } from '../../src/webview/diagram/editor.mjs';
import { transistorStates, meterReadings } from '../../src/webview/diagram/model.mjs';
import '../../src/webview/composants/transistor-element.mjs';
import '../../src/webview/composants/resistor-element.mjs';
import '../../src/webview/composants/led-element.mjs';
import '../../src/webview/composants/potentiometer-element.mjs';
import '../../src/webview/composants/alim-element.mjs';
import '../../src/webview/composants/multimetre-element.mjs';
import '../../src/webview/composants/arduino-uno-element.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
	const editor = new Editor(document.getElementById('canvas'), document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	await wait(50);
	const uno = editor.addPart('uno', 100, 500);
	const alim = editor.addPart('alim', 100, 100);
	editor.updatePartAttr(alim.id, 'voltage', '5');
	editor.updatePartAttr(alim.id, 'maxcurrent', '2');
	const pot = editor.addPart('pot', 400, 100);
	const t4 = editor.addPart('transistor', 700, 300);
	for (const [k, v] of Object.entries({ pkg: 'to220', symbol: 'nmos', schema: 'nmos-d',
		text: 'IRF530', named: '1', ref: 'IRF530', s: '3', g: '1', d: '2',
		gain: '0', rdson: '0.16', vgsth: '3.5', vcemax: '100', icmax: '14' })) {
		editor.updatePartAttr(t4.id, k, v);
	}
	const r4 = editor.addPart('resistor', 700, 100);
	editor.updatePartAttr(r4.id, 'value', '220');
	const led = editor.addPart('led', 900, 100);
	editor.updatePartAttr(led.id, 'color', 'red');
	const volt = editor.addPart('multimetre', 400, 400);
	editor.updatePartAttr(volt.id, 'mode', 'voltage');
	await wait(200);
	// Câblage EXACT du schéma de Frank (fils w-46 à w-50 + w-27/28/29).
	const fils = [
		[pot.id, 'VCC', alim.id, 'V+'],
		[pot.id, 'GND', uno.id, 'GND.1'],
		[pot.id, 'SIG', uno.id, 'A0'],
		[t4.id, 'G', pot.id, 'SIG'],
		[led.id, 'A', alim.id, 'V+'],
		[led.id, 'C', r4.id, '1'],
		[r4.id, '2', t4.id, 'D'],
		[t4.id, 'S', alim.id, 'GND'],
		[uno.id, 'GND.1', alim.id, 'GND'],
		[volt.id, '+', pot.id, 'SIG'],
		[volt.id, 'GND', alim.id, 'GND'],
	];
	for (const [pa, ia, pb, ib] of fils) editor.addWire({ partId: pa, pin: ia }, { partId: pb, pin: ib });
	await wait(250);
	const rows = [];
	for (const pct of [0, 25, 50, 60, 70, 71, 80, 90, 100]) {
		editor.updatePartAttr(pot.id, 'value', String(pct));
		await wait(40);
		const etats = transistorStates(editor.diagram, () => false, 5);
		const t = etats.find((e) => e.partId === t4.id);
		let vm = null;
		try {
			const m = meterReadings(editor.diagram, 5);
			const r = m.find((x) => x.partId === volt.id);
			vm = r ? (r.value === null || r.value === undefined ? 'null' : +Number(r.value).toFixed(3)) : 'ABSENT';
		} catch (e) { vm = 'ERR ' + e.message; }
		rows.push({ pct, attendu: +(pct * 0.05).toFixed(2), voltmetre: vm,
			on: t ? t.on : 'PAS DE T',
			gate: t && t.gateVolts !== undefined ? +Number(t.gateVolts).toFixed(4) : null });
	}
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(rows);
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
const b = await esbuild({ entryPoints: [join(CACHE, 'e.mjs')], bundle: true, format: 'iife', write: false,
	loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl' }, absWorkingDir: ROOT });
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
writeFileSync(join(CACHE, 'p.html'),
	`<!doctype html><meta charset=utf8><style>${css}</style><body style="margin:0">` +
	`<div class="workshop"><aside id="palette" class="palette"></aside>` +
	`<div id="canvas" class="canvas" style="width:1400px;height:900px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox',
	'--virtual-time-budget=40000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`],
	{ encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) { console.error('INTROUVABLE'); process.exit(1); }
const rows = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
if (rows[0]?.err) { console.error(rows[0].err); process.exit(1); }
console.log('AVEC le fil curseur->A0 (montage reel de Frank)');
console.log('pot%   attendu   voltmetre     T4.on        Vgs');
for (const r of rows) {
	console.log(String(r.pct).padStart(4), String(r.attendu).padStart(9), String(r.voltmetre).padStart(11),
		String(r.on).padStart(9), String(r.gate).padStart(11));
}
