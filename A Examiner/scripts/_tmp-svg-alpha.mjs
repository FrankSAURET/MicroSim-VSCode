// Bornes des pixels RÉELLEMENT peints (alpha > seuil) d'un SVG externe, en
// unités du viewBox — à comparer à ce que rend getBBox, qui compte aussi ce qui
// est transparent, blanc sur blanc, ou hors champ.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache-svgalpha');
const nom = process.argv[2] ?? 'ventilo';
const svg = readFileSync(join(ROOT, 'src/webview/composants/externe', nom + '.svg'), 'utf8');
const vb = svg.match(/viewBox="([\d.\-\s]+)"/)[1].trim().split(/\s+/).map(Number);
const [vx, vy, vw, vh] = vb;
const SCALE = 4; // 4 px de rendu par unité de viewBox : sous-pixel négligeable

mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'p.html'), `<!doctype html><meta charset=utf8><body style="margin:0">
<div id="hote" style="width:${vw * SCALE}px;height:${vh * SCALE}px">${svg.replace(/<svg /, '<svg width="' + vw * SCALE + '" height="' + vh * SCALE + '" ')}</div>
<script>
setTimeout(() => {
	const s = document.querySelector('#hote svg');
	const cv = document.createElement('canvas');
	cv.width = ${vw * SCALE}; cv.height = ${vh * SCALE};
	const cx = cv.getContext('2d');
	const img = new Image();
	const blob = new XMLSerializer().serializeToString(s);
	img.onload = () => {
		cx.drawImage(img, 0, 0);
		const d = cx.getImageData(0, 0, cv.width, cv.height).data;
		let l = 1e9, t = 1e9, r = -1, b = -1;
		for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
			if (d[(y * cv.width + x) * 4 + 3] > 12) { if (x<l) l=x; if (x>r) r=x; if (y<t) t=y; if (y>b) b=y; }
		}
		const out = document.createElement('pre'); out.id = 'measures';
		out.textContent = JSON.stringify({ peint: { x: +(l/${SCALE}+${vx}).toFixed(2), y: +(t/${SCALE}+${vy}).toFixed(2),
			w: +((r-l+1)/${SCALE}).toFixed(2), h: +((b-t+1)/${SCALE}).toFixed(2) },
			getBBox: (() => { const g = s.getBBox(); return { x: +g.x.toFixed(2), y: +g.y.toFixed(2), w: +g.width.toFixed(2), h: +g.height.toFixed(2) }; })(),
			viewBox: { x: ${vx}, y: ${vy}, w: ${vw}, h: ${vh} } });
		document.body.appendChild(out);
	};
	img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(blob)));
}, 400);
</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=20000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
console.log(nom, m ? m[1].replace(/&quot;/g, '"') : 'INTROUVABLE');
