// Bascule les 4 items du lot en ✅ et insère la section v2026.9.2.60 au-dessus
// de celle du lot .59 (le plus récent en haut, numéro AU-DESSUS de ses items).
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'todo.md';
let s = readFileSync(p, 'utf8');

// 1) Les 4 items de la liste « À faire » passent en fait, avec le lot qui les porte.
const faits = [
	['1. si j\'ouvre mesure-pico.projix je me trouve avec une feuille grise dans tous les projets projix (le fichier s\'affiche puis tout s\'efface)',
	 '1. ✅ si j\'ouvre mesure-pico.projix je me trouve avec une feuille grise dans tous les projets projix (le fichier s\'affiche puis tout s\'efface) (lot .60)'],
	['1. Ajuste la taille de la barre grise sous le texte d\'info des composants à la taille de ce texte.',
	 '1. ✅ Ajuste la taille de la barre grise sous le texte d\'info des composants à la taille de ce texte. (lot .60)'],
	['1. Note le changement de mes fichiers mesure. Ils sont ceux à partir desquels on continue.',
	 '1. ✅ Note le changement de mes fichiers mesure. Ils sont ceux à partir desquels on continue. (lot .60)'],
	['1. Modifie le multimètre pour que s\'il passe en amperemetre sont font soit un dégradé de vert (pas trop pétant quand même)',
	 '1. ✅ Modifie le multimètre pour que s\'il passe en amperemetre sont font soit un dégradé de vert (pas trop pétant quand même) (lot .60)'],
];
for (const [avant, apres] of faits) {
	if (!s.includes(avant)) throw new Error('item introuvable : ' + avant.slice(0, 60));
	s = s.replace(avant, apres);
}

const section = `# >>>>  v2026.9.2.60 — Un projet venu du disque ne se laisse pas recouvrir

1. ✅ **La feuille grise, c'était une COURSE entre deux messages** (item 1). Le \`.projix\` de Frank était sain — 23 composants, 41 fils, rien à réparer. Ce qui l'effaçait : \`loadProject\` affiche le schéma lu sur le disque, puis \`sendCustomParts()\` — asynchrone, il attend \`library.whenReady()\` — poste \`customParts\` APRÈS, et son gestionnaire rejoue \`restoredState.diagram\`, l'état persisté d'un AUTRE onglet. Le projet apparaissait, puis se faisait recouvrir par du vide.
2. ✅ **L'atelier vient du disque, l'état persisté est donc périmé** ([sim.mts](src/webview/sim.mts)) : \`loadProject\` jette \`restoredState\` au lieu de le laisser traîner pour le message suivant. Une simulation en cours est coupée au passage — sans ça le nouveau schéma se recâblait sur un moteur qui tournait encore pour l'ancien.
3. ✅ **Un deuxième défaut trouvé sur le chemin** ([panel.ts](src/panel.ts)) : un projet à \`customParts: []\` — le cas ORDINAIRE — écrasait le repli global de la bibliothèque en le vidant. Ce repli sert le temps que la bibliothèque finisse de se lire : vidé, la palette perdait ses composants installés. Seul un projet qui en embarque vraiment le renseigne désormais.
4. ✅ **Banc \`verify:reouverture\`** : vrai HTML de webview, vrai bundle de l'éditeur, faux pont \`acquireVsCodeApi\` dont \`getState()\` rend un atelier vide, et la séquence \`ready\` → \`loadProject\` → \`customParts\` rejouée dans l'ordre qui déclenchait le défaut. Il vérifie que le projet s'affiche ET **qu'il reste affiché** quand les composants perso arrivent après. Correctif remisé : « 0 composant après \`customParts\` — attendu 23 ».
5. ✅ **La barre grise se cale sur son TEXTE** (item 2). Elle prenait au moins la largeur du composant (\`min-width: 100%\` en CSS, doublé d'un \`minWidth\` en ligne posé par \`positionHead()\` qui l'emportait) : sur un composant large, elle s'étirait sur toute sa largeur derrière deux caractères d'id. Mesuré avant correction : ventilo 203,7 px pour 57,5 de texte, multimètre 251,4 pour 83,6, carte Uno 293 pour 92,3.
6. ✅ **Les deux réglages retirés, en droit comme en tourné** ([styles.css](media/styles.css), [editor.mts](src/webview/diagram/editor.mts)) : \`width: max-content\` plafonné à 260 px, et plus de \`minWidth\` en ligne. Le contact bandeau/cadre du lot .59 tient toujours. Contrôle ajouté à \`verify:cadre\` sur les cinq composants du banc.
7. ✅ **Le multimètre vire au VERT en ampèremètre** (item 4). Le calibre se lit maintenant à la couleur de la coque, sans avoir à regarder l'écran ni le levier — c'est justement le mode dangereux, celui qui met l'alimentation en court-circuit si on le pose en travers.
8. ✅ **Le dessin de Frank n'est pas retouché** ([multimetre-element.mts](src/webview/composants/multimetre-element.mts)) : seuls les deux \`<stop>\` du dégradé de coque sont réécrits dans le shadow DOM de chaque instance. Chaque multimètre du schéma garde donc sa propre couleur, et l'export rend le SVG d'origine. Vert sourd (\`#8fce9b\` → \`#3f9e63\`), volontairement pas fluo, même écart clair/sombre que le bleu.
9. ✅ **La couleur est jugée PEINTE, pas déclarée** (\`verify:multimetre\`) : le SVG est rendu dans un canevas et le pixel de la coque relevé — bleu \`66,180,225\` en voltmètre, vert \`102,181,126\` en ampèremètre. C'est la seule preuve que la surcharge atteint le dégradé qui peint vraiment : celui-ci référence \`linearGradient49\` par \`xlink:href\`, jamais en direct. Correctif remisé, le banc tombe.
10. ✅ **Les fichiers mesure de Frank font foi** (item 3). \`mesure-uno.projix\` reprend SA version : tout le schéma redisposé, les 46 fils retracés à la main avec leurs points de passage, l'oscilloscope réglé avec son déclenchement, et chaque appareil de mesure étiqueté (\`VMot\`, \`IMot\`, \`Vce\`, \`Vbe\`, \`VBob\`, \`VPot\`, \`Vds\`, « 3,3 V (Power) »).
11. ✅ **Sauf les 92 ko de \`customParts\` parasites**, que ces 4 lignes du lot .59 annonçaient : 7 composants Grove (\`dmx-grove\`, \`grove-rfid\`, \`soil-moisture-sensor\`…) qu'une session F5 avait déposés alors qu'AUCUN composant du schéma ne s'en sert. Le fichier retombe de 94 023 à 3 775 octets, montage et étiquettes intacts. L'original part dans \`A Examiner/\` — rien n'est supprimé.
12. ℹ️ **\`mesure-pico.projix\` n'avait rien** : déjà propre, non modifié. C'est le chargement qui était en cause, pas le fichier — d'où l'item 1.

---

`;

const ancre = '# >>>>  v2026.9.2.59';
const i = s.indexOf(ancre);
if (i < 0) throw new Error('section .59 introuvable');
s = s.slice(0, i) + section + s.slice(i);

writeFileSync(p, s);
console.log('todo.md à jour');
