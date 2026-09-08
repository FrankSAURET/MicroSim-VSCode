import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const f = process.argv[2];
// unzip via PowerShell Expand-Archive : plus simple, on passe par yauzl si dispo
const AdmZip = await import('adm-zip').catch(() => null);
if (AdmZip) {
  const zip = new AdmZip.default(f);
  for (const e of zip.getEntries()) console.log('ENTRY', e.entryName, e.header.size);
  const j = zip.getEntry('kablix.json');
  if (j) writeFileSync('scripts/_tmp-projix.json', j.getData().toString('utf8'));
} else console.log('pas adm-zip');
