// Gobble Run — The Great Turkey Escape: the entrypoint (Node 22,
// standard library only). It hands the game in: it copies game/ and
// screenshots/ from beside this file into the output directory. The
// grader runs it twice and both runs must write the same bytes, so it
// does nothing time-dependent and nothing that reads outside the repo.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const source = join(repoRoot, name);
  if (!existsSync(source)) return 0;
  cpSync(source, join(outDir, name), { recursive: true });
  return readdirSync(source).length;
}

mkdirSync(outDir, { recursive: true });
const gameEntries = copyTree('game');
const shotEntries = copyTree('screenshots');

// The gate's own caps, checked here so a bad hand-in fails loudly in
// our own run instead of quietly in the grader: at most 4 screenshots,
// each at most 256 KiB, and a game/ of at most 993 entries and 48 MiB.
const shots = existsSync(join(repoRoot, 'screenshots')) ? readdirSync(join(repoRoot, 'screenshots')) : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const bytes = statSync(join(repoRoot, 'screenshots', shot)).size;
  if (bytes > 262144) throw new Error(`screenshot ${shot} is ${bytes} bytes, over the 256 KiB cap`);
}
if (gameEntries > 993) throw new Error(`game/ holds ${gameEntries} entries, over the 993 cap`);
const indexPath = join(repoRoot, 'game', 'index.html');
if (!existsSync(indexPath)) throw new Error('game/index.html is missing');
if (statSync(indexPath).size > 1048576) {
  throw new Error(`game/index.html is ${statSync(indexPath).size} bytes, over the 1 MiB cap`);
}

// The dossier the judge reads, written with the vendored make.fun
// library from the copied game/ and screenshots/.
import { buildDossier } from './vendor/makefun-game.ts';
import { writeFileSync } from 'node:fs';

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// One line of summary, so a local run shows at a glance what the
// grader will see: the game entries, the screenshots and the dossier.
const dossierBytes = statSync(join(outDir, 'dossier.json')).size;
console.log(
  `handed in: game/ ${gameEntries} entries, screenshots/ ${shotEntries} files, ` +
    `dossier.json ${dossierBytes} bytes -> ${outDir}`,
);
