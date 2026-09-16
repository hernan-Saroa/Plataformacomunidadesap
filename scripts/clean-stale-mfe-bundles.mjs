/**
 * clean-stale-mfe-bundles.mjs
 *
 * The MFE builds write to ../../build/remotes/<mfe> (outside the project root),
 * so Vite does NOT empty the output dir between builds. Old hashed chunks
 * (e.g. NuevaSolicitudModal-BarsBjmM.js with the idGeopolitica bug) accumulate.
 * If a browser keeps a cached remoteEntry.js, it resolves those OLD chunk
 * filenames — which still exist — and keeps running the previous (buggy) code.
 *
 * This script computes the set of files transitively referenced from
 * remoteEntry.js + index.html and removes the stale JS/CSS leftovers.
 *
 * Usage:
 *   node scripts/clean-stale-mfe-bundles.mjs <mfe-name> [<mfe-name> ...]
 *   node scripts/clean-stale-mfe-bundles.mjs mfe-viaticos
 */
import { readFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const mfes = process.argv.slice(2);
if (mfes.length === 0) {
  console.error('Usage: node clean-stale-mfe-bundles.mjs <mfe-name> [<mfe-name> ...]');
  process.exit(1);
}

function listReferenced(remoteDir) {
  const assetDir = join(remoteDir, 'assets');
  const referenced = new Set();
  // remoteEntry lives in assets/; index.html lives in the remote root.
  const queue = [
    join(remoteDir, 'index.html'),
    join(assetDir, 'remoteEntry.js'),
  ];
  const visited = new Set();

  while (queue.length) {
    const full = queue.pop();
    if (visited.has(full)) continue;
    visited.add(full);
    if (!existsSync(full)) continue;
    const content = readFileSync(full, 'utf8');

    // imports/urls referencing ./name.js or ./assets/...  (all within assets/)
    const pattern = /["'`]([^"'`]+\.(?:js|css|png|svg|woff2?))["'`]/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let ref = match[1];
      if (ref.startsWith('data:') || ref.startsWith('http') || ref.startsWith('//')) continue;
      // Normalize: strip query/hash and leading ./
      ref = ref.split(/[?#]/)[0].replace(/^\.\//, '');
      const base = ref.split('/').pop();
      if (existsSync(join(assetDir, base))) {
        if (!referenced.has(base)) {
          referenced.add(base);
          queue.push(join(assetDir, base));
        }
      } else if (existsSync(join(assetDir, ref))) {
        if (!referenced.has(ref)) {
          referenced.add(ref);
          queue.push(join(assetDir, ref));
        }
      }
    }
  }
  return referenced;
}

let totalRemoved = 0;
for (const mfe of mfes) {
  const remoteDir = join('build', 'remotes', mfe);
  const assetDir = join(remoteDir, 'assets');
  if (!existsSync(assetDir)) {
    console.warn(`Skipping ${mfe}: ${assetDir} not found`);
    continue;
  }

  const referenced = listReferenced(remoteDir);
  const allFiles = readdirSync(assetDir).filter((f) => /\.(js|css)$/.test(f));
  const stale = allFiles.filter((f) => !referenced.has(f));

  console.log(`\n[mfe-viaticos] referenced: ${referenced.size} | files: ${allFiles.length} | stale: ${stale.length}`);
  stale.sort().forEach((f) => {
    const full = join(assetDir, f);
    unlinkSync(full);
    totalRemoved += 1;
    console.log(`  - removed ${f}`);
  });
}

console.log(`\nDone. Removed ${totalRemoved} stale bundle file(s).`);
