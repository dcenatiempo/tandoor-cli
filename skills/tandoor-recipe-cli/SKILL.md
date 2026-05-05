---
name: tandoor-recipe-cli
description: Manage recipes, meal plans, and shopping lists on a Tandoor Recipe Manager instance via CLI.
version: 0.3.1
compatibility: ">=18"
license: MIT
metadata:
  author: dcenatiempo
  repository: https://github.com/dcenatiempo/tandoor-cli
---

## Tandoor CLI Skill

This skill provides AI agents with the ability to interact with a Tandoor Recipe Manager instance using the `tandoor-cli` command-line tool.

### Prerequisites

The `tandoor-cli` tool must be installed and configured. If `tandoor -V` produces no valid version, see the setup instructions in `references/SETUP.md`.

### Invocation

```bash
tandoor <command> [options]
```

### Commands

#### Recipes
| Command | Description |
|---|---|
| `list [--limit N]` | List recipes (default 20, max 100) |
| `search <query>` | Search recipes by keyword |
| `get <id>` | Get full recipe details |
| `random` | Get a random recipe |
| `add [--json file]` | Create a recipe (interactive or from JSON) |
| `update <id> --json file` | Patch an existing recipe |
| `delete <id> [--force]` | Delete a recipe |
| `import <url> [--dry-run]` | Import a recipe from a URL |
| `image <recipeId> <imagePath>` | Upload an image to a recipe (supports JPEG/PNG) |

#### Meal Plans
| Command | Description |
|---|---|
| `mealplan list [--startdate DATE] [--enddate DATE]` | List meal plan entries (optionally filtered by date range) |
| `mealplan add --recipe ID --date YYYY-MM-DD --meal-type N` | Add a meal plan entry |
| `mealplan delete <id>` | Delete a meal plan entry |

#### Shopping List
| Command | Description |
|---|---|
| `shopping list` | List shopping list entries |
| `shopping add --food NAME --amount N --unit UNIT` | Add a shopping list item |
| `shopping check [id]` | Mark a shopping item as checked (or use `--all` for all items) |
| `shopping check --all` | Mark all shopping items as checked |
| `shopping clear [--force]` | Clear all checked items |

#### Households & Users

**Important:** Tandoor uses **households** to organize users and recipes. Users are added to households via **invite links** — you cannot create users directly via the API.

> **Permission Requirements:** Household management commands require special permissions in Tandoor. Most operations need admin/staff privileges. The `household invite create` command specifically requires **space owner** authentication — even superusers or staff members will receive a 403 Permission Denied error if they're not the space owner. If you encounter permission errors, you must use the space owner's API token or contact your Tandoor administrator.

| Command | Description |
|---|---|
| `household list` | List all households |
| `household get <id>` | Get household details by ID |
| `household add <name>` | Create a new household (requires admin) |
| `household edit <id> --name <name>` | Rename a household (requires admin) |
| `household delete <id> [--force]` | Delete a household (requires admin) |
| `household users list` | List all users in the space |
| `household users memberships` | List user-space memberships |
| `household users assign <user-space-id> <household-id>` | Assign a user to a household (requires admin) |
| `household invite list` | List all invite links (requires admin) |
| `household invite create <household-id> [--email EMAIL] [--expires DATE] [--group-id ID]` | Create an invite link (requires space owner token) |
| `household invite delete <id> [--force]` | Delete an invite link (requires admin) |

#### Food Ingredients
| Command | Description |
|---|---|
| `food list [--limit N] [--search TERM] [--ignored]` | List food ingredients |
| `food edit <id\|name> --ignore-shopping <true\|false>` | Edit a food's ignore_shopping flag |
| `food ignore <id\|name> [--unset]` | Set or clear ignore_shopping by ID or name |
| `food onhand <id\|name> [--unset]` | Set or clear the on-hand flag by ID or name |

All read commands accept `--json` for machine-readable output suitable for agent pipelines.

### Configuration

The CLI supports three configuration methods (in precedence order):

1. **Environment variables** — `TANDOOR_URL` and `TANDOOR_API_TOKEN` in the current shell
2. **Config file** — `~/.config/tandoor-cli/config.json` (created by `tandoor configure`)
3. **`.env` file** — a `.env` file in the current working directory

Run `tandoor configure` once to save credentials interactively.

### Examples

**Configure credentials:**
```bash
tandoor configure
```

**Read example — list recipes as JSON:**
```bash
tandoor list --limit 5 --json
```

**Write example — create a recipe from a JSON file:**
```bash
tandoor add --json recipe.json
```

**Image example — upload an image to a recipe:**
```bash
tandoor image 42 ./my-recipe-photo.jpg
```

**Household example — create a household and generate an invite link:**
```bash
tandoor household add "My Family"
tandoor household invite create 1 --email user@example.com --expires 2026-12-31
```

**Shopping list example — add items and check them off:**
```bash
tandoor shopping add --food flour --amount 500 --unit g
tandoor shopping check --all
```

### Reference

See `references/SETUP.md` for detailed setup documentation including authentication configuration.
