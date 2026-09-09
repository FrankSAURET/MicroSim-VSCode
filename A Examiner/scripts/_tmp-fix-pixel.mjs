import { readFileSync, writeFileSync } from 'node:fs';
const p = 'scripts/verify-multimetre.mjs';
let s = readFileSync(p, 'utf8');
// La coque occupe x 11,9..263,3 / y 3,6..85,6 et l'écran x 16,6..216,6 / y 9,1..80,3 :
// il ne reste d'elle qu'un liseré. On lit à mi-hauteur du bord gauche, entre les deux.
s = s.replace("\t\t// Haut de la coque, à gauche de l'écran : peint par le premier stop.\n\t\tconst d = cx.getImageData(20, 12, 1, 1).data;",
	"\t\t// L'écran recouvre presque toute la coque : il n'en reste qu'un liseré.\n\t\t// On lit à mi-hauteur, entre le bord gauche de la coque (x 11,9) et celui\n\t\t// de l'écran (x 16,6) — le seul endroit où la coque est vraiment visible.\n\t\tconst d = cx.getImageData(14, 45, 1, 1).data;");
writeFileSync(p, s);
console.log('ok');
