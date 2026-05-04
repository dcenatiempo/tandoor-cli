# Publishing Guide

This document describes how to publish the tandoor-cli npm package and the Agent Skills to make them publicly available.

---

## Publishing the npm Package

The tandoor-cli npm package is published to the [npm registry](https://www.npmjs.com/package/tandoor-cli).

### Prerequisites

- npm account with publish permissions for the `tandoor-cli` package
- Logged in via `npm login`

### Steps

1. **Update the version** in `package.json` following [semantic versioning](https://semver.org):
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

2. **Build and test**:
   ```bash
   npm run build
   npm test
   ```

3. **Publish to npm**:
   ```bash
   npm publish
   ```
   
   The `prepublishOnly` script will automatically run `npm run build` before publishing.

4. **Verify the package**:
   ```bash
   npx tandoor-cli@latest --version
   ```

---

## Publishing the Agent Skill

The Agent Skill is published via GitHub releases using the `gh skill publish` command from the [GitHub CLI](https://cli.github.com/).

### Prerequisites

- GitHub CLI installed (`brew install gh` on macOS)
- Authenticated with GitHub (`gh auth login`)
- Repository pushed to GitHub

### Steps

1. **Ensure skill files are up to date**:
   - `skills/tandoor-recipe-cli/SKILL.md` - Main skill documentation
   - `skills/tandoor-recipe-cli/references/SETUP.md` - Setup guide
   - Version in SKILL.md frontmatter matches package.json

2. **Validate the skill** (dry run):
   ```bash
   gh skill publish --dry-run
   ```
   
   This checks:
   - Skill name matches directory name
   - Required frontmatter fields are present
   - Naming follows agentskills.io rules

3. **Publish the skill**:
   ```bash
   gh skill publish
   ```
   
   This will:
   - Add the `agent-skills` topic to the repository (if not already present)
   - Prompt you to choose a version tag (e.g., `v0.2.0`)
   - Create a GitHub release with auto-generated notes

   Or publish non-interactively with a specific tag:
   ```bash
   gh skill publish --tag v0.2.0
   ```

4. **Verify the skill**:
   - Check the [releases page](https://github.com/dcenatiempo/tandoor-cli/releases)
   - Verify the `agent-skills` topic appears on the repository
   - Test importing in Kiro using the GitHub URL

### Skill Discovery

Once published, users can import the skill in Kiro or other compatible AI tools:

**Via GitHub URL:**
```
https://github.com/dcenatiempo/tandoor-cli
```

**Via specific skill folder:**
```
https://github.com/dcenatiempo/tandoor-cli/tree/main/skills/tandoor-recipe-cli
```

---

## Version Synchronization

Keep versions synchronized across:
- `package.json` - npm package version
- `skills/tandoor-recipe-cli/SKILL.md` - skill version in frontmatter
- Git tags - GitHub release tags

Recommended format: `v0.2.0` for git tags, `0.2.0` for package.json and SKILL.md.

---

## Troubleshooting

### `gh skill publish` not found

Install the GitHub CLI:
```bash
brew install gh
```

### Permission denied when publishing to npm

Ensure you're logged in and have publish permissions:
```bash
npm login
npm whoami
```

### Skill validation fails

Run with `--dry-run` to see specific errors:
```bash
gh skill publish --dry-run
```

Common issues:
- Skill name doesn't match directory name
- Missing required frontmatter fields (name, description)
- Invalid characters in skill name (must be lowercase, numbers, hyphens only)

---

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Agent Skills Specification](https://agentskills.io/specification)
- [GitHub CLI Skill Commands](https://cli.github.com/manual/gh_skill_publish)
- [Semantic Versioning](https://semver.org/)
