// Reconstruit un .projix depuis un dossier extrait (kablix.json + diagram.json).
import JSZip from 'jszip';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [src, dest] = process.argv.slice(2);
const zip = new JSZip();
zip.file('kablix.json', readFileSync(join(src, 'kablix.json'), 'utf8'));
zip.file('diagram.json', readFileSync(join(src, 'diagram.json'), 'utf8'));
const buf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
writeFileSync(dest, buf);
console.log('écrit', dest, buf.length, 'octets');
