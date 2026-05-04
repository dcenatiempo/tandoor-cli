# Agent Skills Publishing Checklist

Use this checklist before publishing the skill to ensure everything is ready.

## Pre-Publishing Validation

### Skill Structure ✓
- [x] `skills/tandoor-recipe-cli/SKILL.md` exists
- [x] `skills/tandoor-recipe-cli/references/SETUP.md` exists
- [x] Skill name in frontmatter matches directory name (`tandoor-recipe-cli`)
- [x] Skill name follows naming rules (lowercase, numbers, hyphens only)

### Frontmatter Fields ✓
- [x] `name` - matches directory name
- [x] `description` - clear description of when to use the skill
- [x] `version` - matches package.json version (0.2.0)
- [x] `compatibility` - Node.js version requirement (>=18)
- [x] `license` - MIT
- [x] `metadata.author` - dcenatiempo
- [x] `metadata.repository` - GitHub URL

### Content Quality
- [x] SKILL.md contains clear command documentation
- [x] SKILL.md includes usage examples
- [x] references/SETUP.md has installation instructions
- [x] references/SETUP.md has authentication guide
- [x] No hardcoded credentials or private information

### Repository Setup
- [x] README.md mentions the Agent Skills
- [x] PUBLISHING.md documents the publishing process
- [x] .gitignore doesn't exclude skills/ directory
- [x] All skill files are committed to git

## Publishing Steps

### 1. Validate the Skill

```bash
cd tandoor-cli
gh skill publish --dry-run
```

Expected output:
- ✓ Skill name matches directory
- ✓ Required frontmatter fields present
- ✓ No validation errors

### 2. Commit and Push

```bash
git add skills/ README.md PUBLISHING.md SKILL_CHECKLIST.md
git commit -m "Add Agent Skills for tandoor-recipe-cli"
git push origin main
```

### 3. Publish the Skill

```bash
gh skill publish --tag v0.2.0
```

This will:
- Add `agent-skills` topic to the repository
- Create a GitHub release with tag `v0.2.0`
- Make the skill discoverable

### 4. Verify

- [ ] Check releases page: https://github.com/dcenatiempo/tandoor-cli/releases
- [ ] Verify `agent-skills` topic appears on repository
- [ ] Test import in Kiro using GitHub URL

## Import URLs

Once published, users can import using:

**Repository root:**
```
https://github.com/dcenatiempo/tandoor-cli
```

**Direct skill path:**
```
https://github.com/dcenatiempo/tandoor-cli/tree/main/skills/tandoor-recipe-cli
```

**Specific release:**
```
https://github.com/dcenatiempo/tandoor-cli/releases/tag/v0.2.0
```

## Troubleshooting

### Validation fails
- Check skill name matches directory exactly
- Verify all required frontmatter fields are present
- Ensure name uses only lowercase, numbers, and hyphens

### Can't push to GitHub
- Verify you have write access to the repository
- Check git remote: `git remote -v`
- Ensure you're on the correct branch

### gh command not found
- Install GitHub CLI: `brew install gh`
- Authenticate: `gh auth login`

## Post-Publishing

- [ ] Update version in package.json for next release
- [ ] Update version in SKILL.md frontmatter
- [ ] Document any breaking changes in release notes
- [ ] Announce the skill in relevant communities (optional)

---

Last updated: May 4, 2026
