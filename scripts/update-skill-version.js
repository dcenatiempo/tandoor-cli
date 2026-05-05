#!/usr/bin/env node

/**
 * Updates the version field in SKILL.md frontmatter to match package.json
 * This script is automatically run by npm version hooks
 */

const fs = require('fs');
const path = require('path');

// Read package.json to get the new version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const newVersion = packageJson.version;

// Path to SKILL.md
const skillMdPath = path.join(__dirname, '..', 'skills', 'tandoor-recipe-cli', 'SKILL.md');

// Check if SKILL.md exists
if (!fs.existsSync(skillMdPath)) {
  console.error('Error: SKILL.md not found at', skillMdPath);
  process.exit(1);
}

// Read SKILL.md
let skillContent = fs.readFileSync(skillMdPath, 'utf-8');

// Update the version in the frontmatter using regex
// Matches: version: X.Y.Z (with any whitespace)
const versionRegex = /^version:\s*[\d.]+$/m;

if (!versionRegex.test(skillContent)) {
  console.error('Error: Could not find version field in SKILL.md frontmatter');
  process.exit(1);
}

// Replace the version
const updatedContent = skillContent.replace(versionRegex, `version: ${newVersion}`);

// Write back to SKILL.md
fs.writeFileSync(skillMdPath, updatedContent, 'utf-8');

console.log(`✓ Updated SKILL.md version to ${newVersion}`);
