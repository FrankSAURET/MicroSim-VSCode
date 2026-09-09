// Repro item 1 : « le fichier s'affiche puis tout s'efface » (feuille grise).
// Rejoue la SÉQUENCE réelle des messages de l'extension à l'ouverture d'un
// .projix : `loadProject` part le premier (file vidée sur `ready`), puis
// `customParts` arrive — et c'est LUI qui rejoue l'état persisté de la webview.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-course');
const diagram = readFileSync(process.argv[2], 'utf8');

// L'HTML réel de l'atelier, sorti de webview-html.ts avec un faux hôte VS Code.
mkdirSync(CACHE, { recursive: true });
const fauxVscode = {
	name: 'faux-vscode',
	setup(build) {
		build.onResolve({ filter: /^vscode$/ }, () => ({ path: 'vscode', namespace: 'faux' }));
		build.onLoad({ filter: /.*/, namespace: 'faux' }, () => ({
			contents: 'export const l10n = { t: (s, ...a) => String(s).replace(/\\{(\\d+)\\}/g, (_, i) => a[i]) };\n'
				+ 'export const Uri = { joinPath: (...p) => p.join("/") };\n'
				+ 'export const workspace = { getConfiguration: () => ({ get: () => undefined }) };\n'
				+ 'export const env = { language: "fr" };\n'
				+ 'export const extensions = { getExtension: () => ({ packageJSON: { version: "2026.9.2", buildNumber: 59 } }) };\n',
			loader: 'js',
		}));
	},
};
const htmlBundle = await esbuild({
	entryPoints: [join(ROOT, 'src', 'webview-html.ts')],
	bundle: true, format: 'esm', write: false, platform: 'node',
	external: ['node:crypto'], plugins: [fauxVscode],
	absWorkingDir: ROOT,
});
writeFileSync(join(CACHE, 'html.mjs'), htmlBundle.outputFiles[0].text);
const { buildWebviewHtml } = await import('file:///' + join(CACHE, 'html.mjs').split(String.fromCharCode(92)).join('/'));
let html = buildWebviewHtml({ asWebviewUri: (u) => String(u), cspSource: 'file:' }, 'media');

// Le faux pont VS Code doit exister AVANT le bundle : c'est lui qui rend
// l'état persisté (`getState`) — celui de Frank est un atelier VIDE.
const pont = `
window.__trace = 'pont-ok';
window.__err = [];
window.addEventListener('error', (e) => window.__err.push('ERR ' + e.message + ' @' + e.lineno + ':' + e.colno));
window.addEventListener('unhandledrejection', (e) => window.__err.push('REJ ' + ((e.reason && e.reason.message) || e.reason)));
const DIAG = ${diagram};
const ETAT = { diagram: { parts: [], wires: [] }, board: 'uno' };
window.acquireVsCodeApi = () => ({
	postMessage: (m) => { (window.__msgs = window.__msgs || []).push(m && m.type); },
	getState: () => ETAT,
	setState: () => {},
});
`;
const scenario = `
const erreurs = [];
window.addEventListener('error', (e) => erreurs.push('ERR ' + e.message + ' @' + e.lineno));
window.addEventListener('unhandledrejection', (e) => erreurs.push('REJ ' + ((e.reason && e.reason.message) || e.reason)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (m) => window.dispatchEvent(new MessageEvent('message', { data: m }));
const compte = () => document.querySelectorAll('.part').length;
(async () => {
	const etapes = [];
	await wait(600);
	etapes.push(['au demarrage', compte()]);
	// 1. Le projet arrive : file vidée sur « ready ».
	post({ type: 'loadProject', diagram: DIAG, board: 'pico', customParts: [] });
	await wait(900);
	etapes.push(['apres loadProject', compte()]);
	// 2. sendCustomParts() est asynchrone : son message arrive APRES.
	post({ type: 'customParts', parts: [] });
	await wait(900);
	etapes.push(['apres customParts', compte()]);
	etapes.push(['erreurs', (window.__err || []).length, (window.__err || []).slice(0, 3).join(' ~~ ').replace(/[^A-Za-z0-9 .:@_-]/g, '.').slice(0, 500)]);
	etapes.push(['dom', document.querySelectorAll('.canvas__world *').length]);
	etapes.push(['trace', window.__trace || 'PONT ABSENT', typeof window.acquireVsCodeApi]);
	etapes.push(['canvasEl', !!document.getElementById('canvas'), !!document.getElementById('palette'), !!document.getElementById('wires')]);
	etapes.push(['postes', (window.__msgs || []).slice(0, 8)]);
	etapes.push(['canvas', !!document.querySelector('.canvas__world'), document.body.innerHTML.length]);
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify(etapes);
	document.body.appendChild(out);
})();
`;

// Un `</script>` dans une CHAÎNE du bundle refermerait la balise : il faut le
// couper. C'est ce qui rendait la webview inerte, sans la moindre erreur.
const echappe = (t) => t.split('</scr' + 'ipt').join('<\/scr' + 'ipt');
const b = await esbuild({
	entryPoints: [join(ROOT, 'src', 'webview', 'sim.mts')],
	bundle: true, format: 'iife', write: false,
	loader: { '.svg': 'text', '.webp': 'dataurl', '.png': 'dataurl', '.gif': 'dataurl', '.mp4': 'dataurl', '.ico': 'dataurl' },
	absWorkingDir: ROOT,
});
// On remplace le <script src="dist/webview.js"> par le bundle, encadré du pont
// et du scénario.
writeFileSync(join(CACHE, 'pont.js'), pont);
writeFileSync(join(CACHE, 'bundle.js'),
	['try {', b.outputFiles[0].text,
		'} catch (e) { window.__err.push("BUNDLE " + e.message + " | " + String(e.stack).slice(0, 400)); }'].join('\n'));
writeFileSync(join(CACHE, 'scenario.js'), scenario);
html = html.replace(/<script[^>]*src="[^"]*webview\.js"[^>]*>[\s\S]*?<\/script>/,
	'<script src="pont.js"></scr' + 'ipt><script src="bundle.js"></scr' + 'ipt><script src="scenario.js"></scr' + 'ipt>');
const css = readFileSync(join(ROOT, 'media', 'styles.css'), 'utf8');
html = html.replace(/<link[^>]*styles\.css[^>]*>/, `<style>${css}</style>`);
// La CSP de la webview exige un nonce par script : hors VS Code, elle bloquerait
// le bundle et le scénario. On la retire pour le seul temps du test.
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
writeFileSync(join(CACHE, 'p.html'), html);

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const url = 'file:///' + join(CACHE, 'p.html').split(String.fromCharCode(92)).join('/');
let stderr = '';
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=40000', '--dump-dom', '--enable-logging=stderr', '--v=0', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
if (!m) { console.log('MESURES INTROUVABLES'); console.log(dom.slice(0, 3000)); process.exit(1); }
console.log(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')));
