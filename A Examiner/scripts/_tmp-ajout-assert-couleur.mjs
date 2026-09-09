import { readFileSync, writeFileSync } from 'node:fs';
const p = 'scripts/verify-multimetre.mjs';
const lignes = readFileSync(p, 'utf8').split('\n');

const bloc = [
	"    // La coque change de couleur avec le calibre (Frank) : bleue en voltmètre,",
	"    // verte en ampèremètre. On juge la couleur PEINTE, pas l'attribut du `<stop>` :",
	"    // seul compte ce qui sort du dégradé référencé. « Verte » = la composante verte",
	"    // domine ; les écarts plafonnés tiennent la demande « pas trop pétant ».",
	"    const [rv, gv, bv] = r.coqueVolt ?? [0, 0, 0];",
	"    const [ra, ga, ba] = r.coqueAmp ?? [0, 0, 0];",
	"    check(`rendu : voltmètre → coque BLEUE (rgb ${rv},${gv},${bv})`, bv > gv && gv > rv);",
	"    check(`rendu : ampèremètre → coque VERTE (rgb ${ra},${ga},${ba})`, ga > ra && ga > ba);",
	"    check(`rendu : vert sourd, pas fluo (vert-rouge ${ga - ra}, vert-bleu ${ga - ba} ≤ 90)`,",
	"      ga - ra <= 90 && ga - ba <= 90);",
	"    check('rendu : la coque CHANGE de couleur à la bascule',",
	"      `${rv},${gv},${bv}` !== `${ra},${ga},${ba}`);",
].join('\n');

const i = lignes.findIndex((l) => l.includes('levier basculé'));
if (i < 0) throw new Error('ancre introuvable');
lignes.splice(i, 0, bloc);
writeFileSync(p, lignes.join('\n'));
console.log('assertions ok');
