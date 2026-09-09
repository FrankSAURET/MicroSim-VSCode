// Où se trouve VRAIMENT le dessin sur la capture ? Balaye le PNG et donne les
// bornes des pixels non-fond (le fond de feuille est presque blanc).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const png = process.argv[2];
// Décodage via Chrome : plus simple que d'embarquer un décodeur PNG.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const CACHE = join(process.cwd(), 'node_modules', '.cache-scanpng');
mkdirSync(CACHE, { recursive: true });
const dataurl = 'data:image/png;base64,' + readFileSync(png).toString('base64');
writeFileSync(join(CACHE, 'p.html'), `<!doctype html><meta charset=utf8><body><img id=i src="${dataurl}"><script>
const img = document.getElementById('i');
img.onload = () => {
	const cv = document.createElement('canvas');
	cv.width = img.naturalWidth; cv.height = img.naturalHeight;
	const cx = cv.getContext('2d');
	cx.drawImage(img, 0, 0);
	const d = cx.getImageData(0, 0, cv.width, cv.height).data;
	// « sombre » = un pixel du boîtier noir du ventilateur (fond de feuille clair,
	// grille grise très claire, cadre rose).
	let l = 1e9, t = 1e9, r = -1, b = -1;
	for (let y = 120; y < 430; y++) for (let x = 100; x < 400; x++) {
		const i = (y * cv.width + x) * 4;
		const R = d[i], G = d[i+1], B = d[i+2];
		if (R < 90 && G < 90 && B < 90) { if (x<l) l=x; if (x>r) r=x; if (y<t) t=y; if (y>b) b=y; }
	}
	// Le rose du cadre : forte composante rouge et bleue, verte plus faible.
	let pl=1e9, pt=1e9, pr=-1, pb=-1;
	for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
		const i = (y * cv.width + x) * 4;
		const R = d[i], G = d[i+1], B = d[i+2];
		if (R > 190 && B > 190 && G < R - 50) { if (x<pl) pl=x; if (x>pr) pr=x; if (y<pt) pt=y; if (y>pb) pb=y; }
	}
	const out = document.createElement('pre');
	out.id = 'measures';
	out.textContent = JSON.stringify({ sombre: { l, t, r, b, w: r-l+1, h: b-t+1 }, cadreRose: { l: pl, t: pt, r: pr, b: pb, w: pr-pl+1, h: pb-pt+1 } });
	document.body.appendChild(out);
};
</script></body>`);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=15000', '--dump-dom', `file:///${join(CACHE, 'p.html').replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const m = dom.match(/<pre id="measures"[^>]*>([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&quot;/g, '"') : 'INTROUVABLE');
