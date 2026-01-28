#!/usr/bin/env node

/**
 * Version Bump Script
 * 
 * Updates version numbers in package.json and version.ts
 * 
 * Usage:
 *   node app/scripts/version-bump.js [major|minor|patch]
 * 
 * Examples:
 *   node app/scripts/version-bump.js patch   # 0.1.0 -> 0.1.1
 *   node app/scripts/version-bump.js minor   # 0.1.0 -> 0.2.0
 *   node app/scripts/version-bump.js major   # 0.1.0 -> 1.0.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get script directory and project root
const scriptDir = __dirname;
const appDir = join(scriptDir, '..');
const projectRoot = join(appDir, '..');

const [,, type] = process.argv;

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Usage: node app/scripts/version-bump.js [major|minor|patch]');
  console.error('');
  console.error('Examples:');
  console.error('  node app/scripts/version-bump.js patch   # 0.1.0 -> 0.1.1');
  console.error('  node app/scripts/version-bump.js minor   # 0.1.0 -> 0.2.0');
  console.error('  node app/scripts/version-bump.js major   # 0.1.0 -> 1.0.0');
  process.exit(1);
}

try {
  // Read current version from package.json
  const packageJsonPath = join(appDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const [major, minor, patch] = packageJson.version.split('.').map(Number);

  let newVersion;
  if (type === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else if (type === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }

  console.log(`Bumping version: ${packageJson.version} -> ${newVersion}`);

  // Update package.json
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated ${packageJsonPath}`);

  // Update version.ts
  const versionTsPath = join(appDir, 'src', 'constants', 'version.ts');
  const versionTs = `export const VERSION = '${newVersion}'\n`;
  writeFileSync(versionTsPath, versionTs);
  console.log(`✓ Updated ${versionTsPath}`);

  console.log('');
  console.log('Version bumped successfully!');
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Review changes: git diff`);
  console.log(`  2. Stage files: git add app/package.json app/src/constants/version.ts`);
  console.log(`  3. Commit: git commit -m "Bump version to ${newVersion}"`);
  console.log(`  4. Tag: git tag -a v${newVersion} -m "Release v${newVersion}"`);
  console.log(`  5. Update CHANGELOG.md with changes for this version`);
  
} catch (error) {
  console.error('Error bumping version:', error.message);
  process.exit(1);
}
