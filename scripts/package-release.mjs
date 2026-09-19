/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Build the exact folder you upload to DirectAdmin
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Run AFTER `npm run build`:
 *
 *     npm run package
 *
 * Produces `release/` — a mirror of what public_html/ should contain, and
 * nothing else. No node_modules, no source, no .git, no real config.php.
 * Zip it (or drag the contents into File Manager) and you are done.
 */

import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const release = path.join(root, 'release');

// ── Everything that belongs on the server ──────────────────────────────────
const COPY = [
  // Static export: its CONTENTS go to the web root.
  { from: 'out', to: '.', spread: true, required: true },
  // PHP backend.
  { from: 'api', to: 'api', required: true },
  // Emergency panel (delete after setup — the README says so).
  { from: 'rescue', to: 'rescue', required: true },
  // SQL to import through phpMyAdmin.
  { from: 'database', to: 'database', required: true },
  // Writable upload root, with its protection file.
  { from: 'uploads', to: 'uploads', required: false },
  // Root Apache config.
  { from: '.htaccess', to: '.htaccess', required: true },
];

// Config is copied as the EXAMPLE only; real secrets never leave the machine.
const CONFIG_EXAMPLE = { from: 'config/config.example.php', to: 'config/config.example.php' };

async function main() {
  if (!existsSync(path.join(root, 'out', 'index.html'))) {
    console.error('\n✗ out/index.html is missing. Run `npm run build` first.\n');
    process.exit(1);
  }

  await rm(release, { recursive: true, force: true });
  await mkdir(release, { recursive: true });

  for (const entry of COPY) {
    const source = path.join(root, entry.from);
    if (!existsSync(source)) {
      if (entry.required) {
        console.error(`✗ missing required path: ${entry.from}`);
        process.exit(1);
      }
      continue;
    }
    if (entry.spread) {
      for (const name of await readdir(source)) {
        await cp(path.join(source, name), path.join(release, name), { recursive: true });
      }
    } else {
      await cp(source, path.join(release, entry.to), { recursive: true });
    }
    console.log(`  ✓ ${entry.from}`);
  }

  // config/ ships with the template + its deny rule, never the live file.
  await mkdir(path.join(release, 'config'), { recursive: true });
  await cp(path.join(root, CONFIG_EXAMPLE.from), path.join(release, CONFIG_EXAMPLE.to));
  if (existsSync(path.join(root, 'config/.htaccess'))) {
    await cp(path.join(root, 'config/.htaccess'), path.join(release, 'config/.htaccess'));
  }
  console.log('  ✓ config/config.example.php  (config.php is NOT shipped — create it on the server)');

  // Writable runtime folders, with .gitkeep so empty dirs survive zipping.
  for (const dir of ['uploads', 'storage/logs']) {
    await mkdir(path.join(release, dir), { recursive: true });
    await writeFile(path.join(release, dir, '.gitkeep'), '');
  }
  if (existsSync(path.join(root, 'uploads/.htaccess'))) {
    await cp(path.join(root, 'uploads/.htaccess'), path.join(release, 'uploads/.htaccess'));
  }
  if (existsSync(path.join(root, 'storage/.htaccess'))) {
    await cp(path.join(root, 'storage/.htaccess'), path.join(release, 'storage/.htaccess'));
  }
  console.log('  ✓ uploads/ and storage/logs/  (chmod 755 after upload)');

  // Safety net: fail loudly if a real secret ever sneaks into the bundle.
  const leaked = path.join(release, 'config/config.php');
  if (existsSync(leaked)) {
    console.error('\n✗ REFUSING TO FINISH: config/config.php ended up in release/.');
    process.exit(1);
  }

  // Size report.
  let bytes = 0;
  let files = 0;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else { bytes += (await stat(full)).size; files += 1; }
    }
  };
  await walk(release);

  console.log(`\n▸ release/ ready — ${files} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  console.log('  Upload the CONTENTS of release/ into public_html/');
  console.log('  Then: create config/config.php from the example, import the SQL,');
  console.log('  and follow README-DEPLOYMENT.md from step 9.\n');
}

main().catch((error) => {
  console.error('package-release failed:', error);
  process.exit(1);
});
