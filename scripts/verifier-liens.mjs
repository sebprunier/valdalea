// Vérifie que les pages officielles citées par le jeu répondent toujours.
// Usage : npm run liens
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const sources = JSON.parse(await readFile(new URL('../src/content/sources.json', import.meta.url), 'utf8'));

/** Code HTTP de la page, ou un texte décrivant l'erreur. */
async function check(url) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    return response.status;
  } catch (error) {
    // Certains serveurs envoient une chaîne de certificats incomplète, que Node refuse
    // alors que les navigateurs la complètent : on redemande alors la page avec curl.
    try {
      const { stdout } = await run('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '30', '-w', '%{http_code}', url]);
      return Number(stdout);
    } catch {
      return `erreur (${error.cause?.code ?? error.name})`;
    }
  }
}

let broken = 0;
for (const [id, source] of Object.entries(sources)) {
  const status = await check(source.url);
  const ok = status === 200;
  if (!ok) broken++;
  console.log(`${ok ? 'OK  ' : 'KO  '} ${String(status).padEnd(5)} ${id}\n      ${source.url}`);
}

console.log(broken === 0 ? '\nToutes les sources répondent.' : `\n${broken} source(s) à vérifier à la main.`);
process.exitCode = broken === 0 ? 0 : 1;
