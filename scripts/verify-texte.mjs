// Test de régression : les ÉTIQUETTES DE TEXTE LIBRES (v2026.9.2.65).
// Demande de Frank : « Ajoute un générateur d'étiquette. Juste du texte
// déplaçable comme un composant. Plusieurs lignes possible. La zone s'étend en
// fonction du texte. […] Un clic sur l'icône la passe en mode appuyé, on peut
// mettre du texte où on veut. On quitte le mode texte en recliquant sur l'icône
// ou en cliquant sur n'importe quoi d'autre […] Si le mode texte est activé, on
// peut éditer le texte. On peut aussi le copier ou coller du texte. »
//
// Ce qui est vérifié dans le VRAI éditeur (bundle esbuild, Chrome headless) :
//   1. le mode texte s'active/se quitte, et un clic sur le fond pose une
//      étiquette éditable au lieu d'ouvrir un rectangle de sélection ;
//   2. la zone s'étend avec le texte, en largeur ET en hauteur (multi-lignes) ;
//   3. l'étiquette se déplace comme un composant, et s'aligne sur la grille ;
//   4. hors mode texte, un clic la sélectionne SANS ouvrir la saisie ;
//   5. le mode se quitte au clic ailleurs (un composant) et à la perte de focus ;
//   6. couleurs et police posées par Frank (#100ae5 sur #ffe10067, taille du
//      bandeau de nom), et l'étiquette est au PREMIER PLAN (au-dessus des fils) ;
//   7. enregistrement/rechargement : le texte et sa position survivent, et un
//      schéma SANS étiquette ne grave pas le champ ;
//   8. suppression : Suppr sur l'étiquette sélectionnée, et une étiquette vidée
//      de son texte disparaît d'elle-même ;
//   9. la simulation (setLocked) quitte le mode texte et fige les étiquettes ;
//  10. l'export SVG emporte le texte, au premier plan.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-texte');

const entry = `
import { Editor } from '../../src/webview/diagram/editor.mjs';
import '../../src/webview/composants/led-element.mjs';
import '../../src/webview/composants/resistor-element.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const ok = (name, cond, detail = '') => checks.push({ name, ok: !!cond, detail: String(detail) });

async function run() {
	const canvas = document.getElementById('canvas');
	const editor = new Editor(canvas, document.getElementById('palette'),
		document.getElementById('wires'), document.getElementById('inspector'));
	const world = document.querySelector('.canvas__world');
	editor.setCamera({ zoom: 1, panX: 0, panY: 0 });
	await wait(40);

	const notes = () => [...document.querySelectorAll('.text-note')];
	const corps = (n) => n.querySelector('.text-note__body');
	// Point ÉCRAN d'une coordonnée monde (zoom 1, pan connu) : le clic de pose
	// doit tomber sur le fond de la feuille, jamais sur un composant.
	const ecran = (wx, wy) => {
		const wr = world.getBoundingClientRect();
		const z = editor.getCamera().zoom;
		return { x: wr.left + wx * z, y: wr.top + wy * z };
	};
	// Clic sur le FOND : la cible doit être le canvas lui-même (c'est ce que
	// teste le gestionnaire de l'éditeur), donc on émet depuis lui.
	const clicFond = (wx, wy) => {
		const p = ecran(wx, wy);
		canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
			button: 0, clientX: p.x, clientY: p.y }));
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: p.x, clientY: p.y }));
	};
	// Saisie dans l'étiquette en édition : on écrit dans le contenteditable puis
	// on émet 'input', comme le fait un vrai clavier.
	const tape = (n, texte) => {
		const b = corps(n);
		b.textContent = '';
		for (const [i, ligne] of texte.split('\\n').entries()) {
			if (i > 0) b.appendChild(document.createElement('br'));
			b.appendChild(document.createTextNode(ligne));
		}
		b.dispatchEvent(new InputEvent('input', { bubbles: true }));
	};
	const contOf = (id) => [...document.querySelectorAll('.part')]
		.find((c) => (c.querySelector('.part__id')?.textContent ?? '') === id);

	// --- 1. Le mode texte s'active, et le clic sur le fond pose une étiquette ---
	ok('au démarrage, le mode texte est éteint', editor.isTextMode() === false);
	let vus = [];
	editor.onTextModeChange = (on) => vus.push(on);
	ok('le bouton allume le mode texte', editor.toggleTextMode() === true && editor.isTextMode());
	ok('le changement est signalé au bouton de la barre (état enfoncé)',
		vus.length === 1 && vus[0] === true, JSON.stringify(vus));
	ok('la feuille annonce le mode par sa classe', canvas.classList.contains('canvas--text-mode'));

	ok('avant tout clic, aucune étiquette', notes().length === 0, notes().length);
	clicFond(300, 200);
	await wait(40);
	ok('un clic sur le fond POSE une étiquette', notes().length === 1, notes().length);
	ok('et aucun rectangle de sélection ne s est ouvert',
		document.querySelectorAll('.marquee').length === 0);
	let n1 = notes()[0];
	ok('elle est posée là où l on a cliqué (grille de 10 px)',
		n1.style.left === '300px' && n1.style.top === '200px',
		n1.style.left + ',' + n1.style.top);
	ok('sa saisie est ouverte tout de suite', corps(n1).contentEditable === 'true',
		corps(n1).contentEditable);
	ok('et elle est marquée comme en cours d édition', n1.classList.contains('text-note--editing'));

	// --- 2. La zone s'étend avec le texte ---------------------------------------
	const vide = n1.getBoundingClientRect();
	tape(n1, 'Alimentation 5 V');
	await wait(30);
	const court = n1.getBoundingClientRect();
	ok('la zone s élargit avec le texte', court.width > vide.width + 20,
		vide.width.toFixed(1) + ' -> ' + court.width.toFixed(1));
	tape(n1, 'Alimentation 5 V regulee, tres longue etiquette de test');
	await wait(30);
	const long = n1.getBoundingClientRect();
	ok('un texte plus long donne une zone plus large', long.width > court.width + 40,
		court.width.toFixed(1) + ' -> ' + long.width.toFixed(1));
	tape(n1, 'Ligne une\\nLigne deux\\nLigne trois');
	await wait(30);
	const multi = n1.getBoundingClientRect();
	ok('plusieurs lignes : la zone grandit en HAUTEUR', multi.height > vide.height * 2.2,
		vide.height.toFixed(1) + ' -> ' + multi.height.toFixed(1) + ' pour 3 lignes');

	// Validation : on ferme la saisie, le modèle doit porter les trois lignes.
	corps(n1).dispatchEvent(new FocusEvent('blur'));
	await wait(30);
	const modele = editor.diagram.texts;
	ok('le texte saisi est repris dans le schéma', modele.length === 1
		&& modele[0].text.split('\\n').length === 3, JSON.stringify(modele));
	ok('les sauts de ligne sont conservés tels quels',
		modele[0].text === 'Ligne une\\nLigne deux\\nLigne trois', JSON.stringify(modele[0].text));
	ok('et la saisie est refermée', corps(n1).contentEditable !== 'true');

	// --- 3. Déplacement comme un composant --------------------------------------
	const glisseNote = async (n, sdx, sdy) => {
		const b = n.getBoundingClientRect();
		const x0 = b.left + 5;
		const y0 = b.top + 5;
		n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
			button: 0, clientX: x0, clientY: y0 }));
		for (const k of [0.1, 0.5, 1]) {
			window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true,
				clientX: x0 + sdx * k, clientY: y0 + sdy * k }));
			await wait(12);
		}
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
		await wait(25);
	};
	await glisseNote(n1, 137, 84);
	const apres = editor.diagram.texts[0];
	ok('l étiquette se déplace comme un composant', apres.x > 400 && apres.y > 260,
		apres.x + ',' + apres.y);
	ok('et elle se recolle sur la grille de 10 px', apres.x % 10 === 0 && apres.y % 10 === 0,
		apres.x + ',' + apres.y);
	ok('le DOM suit le modèle', n1.style.left === apres.x + 'px' && n1.style.top === apres.y + 'px',
		n1.style.left + ',' + n1.style.top);

	// --- 4. Hors mode texte, un clic sélectionne sans ouvrir la saisie ----------
	editor.toggleTextMode(false);
	await wait(20);
	ok('recliquer l icône éteint le mode', editor.isTextMode() === false);
	const b4 = n1.getBoundingClientRect();
	n1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
		button: 0, clientX: b4.left + 5, clientY: b4.top + 5 }));
	window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
	await wait(30);
	ok('hors mode texte, le clic SÉLECTIONNE l étiquette',
		n1.classList.contains('text-note--selected'));
	ok('mais n ouvre PAS la saisie', corps(n1).contentEditable !== 'true',
		corps(n1).contentEditable);
	// Le clic sur le fond hors mode texte ne pose plus rien.
	clicFond(900, 700);
	await wait(30);
	ok('hors mode texte, un clic sur le fond ne pose aucune étiquette',
		notes().length === 1, notes().length);

	// --- 5. On quitte le mode texte en cliquant AILLEURS -------------------------
	const led = editor.addPart('led', 800, 500);
	await wait(120);
	editor.toggleTextMode(true);
	ok('mode texte rallumé', editor.isTextMode());
	const corpsLed = contOf(led.id).querySelector('.part__body');
	const bl = corpsLed.getBoundingClientRect();
	corpsLed.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
		button: 0, clientX: bl.left + 4, clientY: bl.top + 4 }));
	window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
	await wait(30);
	ok('cliquer un COMPOSANT quitte le mode texte', editor.isTextMode() === false);
	editor.toggleTextMode(true);
	document.getElementById('inspector').dispatchEvent(new PointerEvent('pointerdown',
		{ bubbles: true, composed: true, button: 0, clientX: 5, clientY: 5 }));
	await wait(20);
	ok('cliquer l inspecteur quitte le mode texte', editor.isTextMode() === false);
	editor.toggleTextMode(true);
	window.dispatchEvent(new FocusEvent('blur'));
	await wait(20);
	ok('la perte de focus de Kablix quitte le mode texte', editor.isTextMode() === false);
	// Échap aussi (comme pour le câblage en cours).
	editor.toggleTextMode(true);
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	await wait(20);
	ok('Échap quitte le mode texte', editor.isTextMode() === false);

	// --- 6. Aspect : couleurs, police, premier plan ------------------------------
	const cs = getComputedStyle(corps(n1));
	const csN = getComputedStyle(n1);
	ok('encre bleue #100ae5, comme demandé', cs.color === 'rgb(16, 10, 229)', cs.color);
	ok('fond jaune translucide #ffe10067', /^rgba\\(255, ?225, ?0, ?0\\.4/.test(csN.backgroundColor),
		csN.backgroundColor);
	ok('aucune bordure autour de la zone', csN.borderStyle === 'none' || csN.borderTopWidth === '0px',
		csN.borderStyle + ' ' + csN.borderTopWidth);
	ok('coins arrondis', parseFloat(csN.borderTopLeftRadius) > 0, csN.borderTopLeftRadius);
	// Même police et même taille que le bandeau de nom des composants.
	const head = contOf(led.id).querySelector('.part__head');
	const csH = getComputedStyle(head);
	ok('même taille de police que le bandeau de nom des composants',
		cs.fontSize === csH.fontSize, cs.fontSize + ' vs ' + csH.fontSize);
	ok('et la même police', cs.fontFamily === csH.fontFamily, cs.fontFamily);
	// Premier plan : la couche de texte doit passer au-dessus des fils (z=5) et
	// des composants (z=3), tout en restant sous les défauts (z=80).
	const zTexte = parseInt(getComputedStyle(document.querySelector('.text-layer')).zIndex, 10);
	const zFils = parseInt(getComputedStyle(document.getElementById('wires')).zIndex, 10) || 5;
	const zDefauts = parseInt(getComputedStyle(document.querySelector('.fault-layer')).zIndex, 10);
	ok('les étiquettes sont AU PREMIER PLAN (au-dessus des fils)', zTexte > zFils,
		'texte ' + zTexte + ' / fils ' + zFils);
	ok('mais sous les explications de défaut', zTexte < zDefauts,
		'texte ' + zTexte + ' / défauts ' + zDefauts);

	// --- 7. Enregistrement / rechargement ---------------------------------------
	const dump = editor.serialize();
	ok('le schéma enregistré porte l étiquette', dump.texts && dump.texts.length === 1,
		JSON.stringify(dump.texts));
	ok('avec son texte et sa position', dump.texts[0].text.includes('Ligne deux')
		&& dump.texts[0].x === apres.x, JSON.stringify(dump.texts[0]));
	editor.loadDiagram(dump);
	await wait(200);
	ok('après rechargement, l étiquette est toujours là', notes().length === 1, notes().length);
	ok('avec le MÊME texte', editor.diagram.texts[0].text === dump.texts[0].text,
		JSON.stringify(editor.diagram.texts[0]));
	ok('et à la même place', notes()[0].style.left === apres.x + 'px', notes()[0].style.left);
	// Un schéma sans aucune étiquette ne grave pas le champ (fichiers d'avant).
	editor.clear();
	await wait(40);
	const vierge = editor.serialize();
	ok('un schéma SANS étiquette ne grave pas le champ texts', !('texts' in vierge),
		JSON.stringify(Object.keys(vierge)));

	// --- 8. Suppression ----------------------------------------------------------
	editor.toggleTextMode(true);
	clicFond(200, 150);
	await wait(40);
	let n2 = notes()[0];
	tape(n2, 'A supprimer');
	corps(n2).dispatchEvent(new FocusEvent('blur'));
	await wait(30);
	ok('nouvelle étiquette enregistrée', editor.diagram.texts.length === 1);
	editor.toggleTextMode(false);
	const b8 = n2.getBoundingClientRect();
	n2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
		button: 0, clientX: b8.left + 5, clientY: b8.top + 5 }));
	window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
	await wait(20);
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
	await wait(30);
	ok('Suppr efface l étiquette sélectionnée', editor.diagram.texts.length === 0
		&& notes().length === 0, editor.diagram.texts.length + ' / ' + notes().length);
	// Étiquette VIDÉE de son texte : elle disparaît d'elle-même.
	editor.toggleTextMode(true);
	clicFond(250, 250);
	await wait(40);
	let n3 = notes()[0];
	tape(n3, 'Provisoire');
	corps(n3).dispatchEvent(new FocusEvent('blur'));
	await wait(30);
	ok('étiquette posée puis validée', editor.diagram.texts.length === 1);
	const b3 = n3.getBoundingClientRect();
	n3.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
		button: 0, clientX: b3.left + 5, clientY: b3.top + 5 }));
	window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
	await wait(30);
	ok('en mode texte, le clic ROUVRE la saisie', corps(n3).contentEditable === 'true',
		corps(n3).contentEditable);
	tape(n3, '   ');
	corps(n3).dispatchEvent(new FocusEvent('blur'));
	await wait(30);
	ok('une étiquette vidée de son texte disparaît',
		editor.diagram.texts.length === 0 && notes().length === 0,
		editor.diagram.texts.length + ' / ' + notes().length);

	// --- 9. Simulation : mode quitté, étiquettes figées ---------------------------
	editor.toggleTextMode(true);
	clicFond(400, 400);
	await wait(40);
	const n4 = notes()[0];
	tape(n4, 'Etiquette de sim');
	corps(n4).dispatchEvent(new FocusEvent('blur'));
	await wait(30);
	editor.toggleTextMode(true);
	editor.setLocked(true);
	await wait(40);
	ok('le lancement de la simulation quitte le mode texte', editor.isTextMode() === false);
	ok('et il refuse de le rallumer', editor.toggleTextMode(true) === false && !editor.isTextMode());
	ok('l étiquette reste VISIBLE pendant la simulation', notes().length === 1
		&& getComputedStyle(notes()[0]).display !== 'none');
	ok('mais elle ne se touche plus', getComputedStyle(notes()[0]).pointerEvents === 'none',
		getComputedStyle(notes()[0]).pointerEvents);
	editor.setLocked(false);
	await wait(30);
	ok('après la simulation, le mode texte est de nouveau permis',
		editor.toggleTextMode(true) === true);
	editor.toggleTextMode(false);

	// --- 10. Export SVG ------------------------------------------------------------
	editor.addPart('resistor', 300, 300);
	await wait(120);
	const svg = editor.exportSvg();
	ok('l export SVG emporte le texte de l étiquette', svg.includes('Etiquette de sim'), '');
	ok('avec l encre de Frank', svg.includes('#100ae5'), '');
	// Premier plan : le bloc de l'étiquette vient APRÈS le dessin du composant.
	const iNote = svg.indexOf('Etiquette de sim');
	const iPart = svg.indexOf('<g transform') >= 0 ? svg.indexOf('<g transform') : svg.indexOf('<svg', 40);
	ok('et elle est dessinée au premier plan (après les composants)', iNote > iPart,
		'note à ' + iNote + ', composants à ' + iPart);

	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(checks);
	document.body.appendChild(out);
}
run().catch((e) => {
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify([{ name: 'exception : ' + (e && e.message), ok: false, detail: String(e && e.stack).slice(0, 300) }]);
	document.body.appendChild(out);
});
`;
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'e.mjs'), entry);
const b = await esbuild({ entryPoints: [join(CACHE, 'e.mjs')], bundle: true, format: 'iife', write: false, loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl' }, absWorkingDir: ROOT });
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
writeFileSync(
	join(CACHE, 'p.html'),
	`<!doctype html><meta charset=utf8><style>${css}</style><body style="margin:0">` +
	`<div class="workshop"><aside id="palette" class="palette"></aside>` +
	`<div id="canvas" class="canvas" style="width:1200px;height:900px"><svg id="wires" class="wires"></svg></div>` +
	`<aside id="inspector" class="inspector"></aside></div>` +
	`<script>${b.outputFiles[0].text}</script></body>`
);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!chrome) { console.log('Chrome introuvable — test sauté'); process.exit(0); }
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=40000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) { console.log('MESURES INTROUVABLES'); process.exit(1); }
const rows = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
let fail = 0;
for (const r of rows) {
	if (!r.ok) fail++;
	console.log(`${r.ok ? '✅' : '❌'} ${r.name}${!r.ok ? ` — ${r.detail}` : ''}`);
}
console.log(fail ? `texte : ${fail} échec(s).` : `texte : ${rows.length} contrôles OK — étiquettes de texte libres.`);
process.exit(fail ? 1 : 0);
