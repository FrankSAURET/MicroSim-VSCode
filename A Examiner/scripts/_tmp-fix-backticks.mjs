import { readFileSync, writeFileSync } from 'node:fs';
const p = 'scripts/verify-multimetre.mjs';
let s = readFileSync(p, 'utf8');
// Les commentaires de la sonde vivent DANS le gabarit du scénario navigateur :
// pas d'accent inverse, il fermerait la chaîne.
s = s.replace("un pixel du haut de `rect118-7` : c'est la seule", "un pixel du haut de la coque : c'est la seule");
s = s.replace("// preuve que la surcharge des `<stop>` atteint bien le dégradé qui peint la",
              "// preuve que la surcharge des deux stops atteint bien le dégradé qui peint la");
s = s.replace("// coque — celui-ci référence `linearGradient49` par `xlink:href`, jamais en",
              "// coque : celui-ci référence linearGradient49 par xlink:href, jamais en");
s = s.replace("// direct, et un `<stop>` modifié pourrait très bien ne pas s'y propager.",
              "// direct, et un stop modifié pourrait très bien ne pas s'y propager.");
s = s.replace("\t\t// Haut de la coque, à gauche de l'écran : peint par le premier `<stop>`.",
              "\t\t// Haut de la coque, à gauche de l'écran : peint par le premier stop.");
writeFileSync(p, s);
console.log('ok');
