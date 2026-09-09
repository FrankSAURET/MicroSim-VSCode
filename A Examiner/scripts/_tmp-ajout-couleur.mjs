import { readFileSync, writeFileSync } from 'node:fs';
const p = 'scripts/verify-multimetre.mjs';
let s = readFileSync(p, 'utf8');

const sonde = [
	"\t// Couleur PEINTE de la coque. On sérialise le SVG du composant, on le rend",
	"\t// dans un canvas et on lit un pixel du haut de `rect118-7` : c'est la seule",
	"\t// preuve que la surcharge des `<stop>` atteint bien le dégradé qui peint la",
	"\t// coque — celui-ci référence `linearGradient49` par `xlink:href`, jamais en",
	"\t// direct, et un `<stop>` modifié pourrait très bien ne pas s'y propager.",
	"\tconst coque = async () => {",
	"\t\tconst xml = new XMLSerializer().serializeToString(sh.querySelector('svg'));",
	"\t\tconst img = new Image();",
	"\t\tawait new Promise((ok, ko) => {",
	"\t\t\timg.onload = ok; img.onerror = ko;",
	"\t\t\timg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));",
	"\t\t});",
	"\t\tconst c = document.createElement('canvas');",
	"\t\tc.width = 270; c.height = 90;",
	"\t\tconst cx = c.getContext('2d');",
	"\t\tcx.drawImage(img, 0, 0, 270, 90);",
	"\t\t// Haut de la coque, à gauche de l'écran : peint par le premier `<stop>`.",
	"\t\tconst d = cx.getImageData(20, 12, 1, 1).data;",
	"\t\treturn [d[0], d[1], d[2]];",
	"\t};",
	"\tres.coqueVolt = await coque();",
].join('\n');

const anc = "\tres.levVolt = ";
const i = s.indexOf(anc);
if (i < 0) throw new Error('ancre levVolt introuvable');
s = s.slice(0, i) + sonde + '\n' + s.slice(i);

const anc2 = "\tres.levAmp = ";
const j = s.indexOf(anc2);
if (j < 0) throw new Error('ancre levAmp introuvable');
s = s.slice(0, j) + '\tres.coqueAmp = await coque();\n' + s.slice(j);

writeFileSync(p, s);
console.log('scenario ok');
