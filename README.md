# tandoor-cli

A command-line interface for [Tandoor Recipe Manager](https://tandoor.dev). Manage recipes, meal plans, and shopping lists from your terminal.

---

## Prerequisites

- Node.js 18+
- npm 8+
- A running Tandoor instance (local or remote)

---

## Installation

### Run without installing 

```bash
npx tandoor-cli <command>
```

No global install required. `npx` downloads and runs the latest version automatically.

### Global install

```bash
npm instll tandoor-cli -g
```

After the global install, the `tandoor` command is available directly.

---

## Configuration

`tandoor-cli` supports three configuration methods. Precedence order (highest to lowest):

1. **Environment variables** — `TANDOOR_URL` and `TANDOOR_API_TOKEN` set in the current shell
2. **Config file** — `~/.config/tandoor-cli/config.json`, written by `tandoor configure`
3. **`.env` file** — a `.env` file in the current working directory

`TANDOOR_URL` and at least one auth method are required. If neither is found, the CLI exits with a descriptive error.

### Option 1: `tandoor configure` (recommended for interactive use)

Run the configure command once to save your credentials to a persistent config file:

```bash
npx tandoor-cli configure
```

You will be prompted for:
- `TANDOOR_URL` — the base URL of your Tandoor instance (e.g. `http://localhost:8080`)
- `TANDOOR_API_TOKEN` — your API token (see [Authentication](#authentication) below)

Credentials are saved to `~/.config/tandoor-cli/config.json` (or `$XDG_CONFIG_HOME/tandoor-cli/config.json` if `XDG_CONFIG_HOME` is set) with permissions `0600`. Re-running `configure` shows the current values as defaults so you can accept or update them.

### Option 2: Environment variables

```bash
export TANDOOR_URL=http://localhost:8080
export TANDOOR_API_TOKEN=your_token_here
npx tandoor-cli list
```

Environment variables take precedence over the config file and `.env`.

### Option 3: `.env` file

Create a `.env` file in your working directory (copy from `.env.example`):

```dotenv
# Required: base URL of your Tandoor instance
TANDOOR_URL=http://localhost:8080

# Preferred: API token (see Authentication section below)
TANDOOR_API_TOKEN=your_token_here

# Fallback: basic auth (used only if TANDOOR_API_TOKEN is not set)
TANDOOR_USERNAME=
TANDOOR_PASSWORD=
```

The CLI loads `.env` automatically on startup.

---

## Authentication

### API Token (preferred)

Tandoor's API uses **OAuth2 Bearer tokens**. The token shown in Settings → API is a DRF token and won't work — you need to generate an OAuth2 access token directly via the Django shell.

Run this once against your Docker container to create a long-lived token:

```bash
docker exec <your-container-name> /opt/recipes/venv/bin/python /opt/recipes/manage.py shell -c "
from oauth2_provider.models import Application, AccessToken
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import secrets

user = User.objects.get(username='YOUR_USERNAME')

# Create the OAuth2 app if it doesn't exist yet
app, _ = Application.objects.get_or_create(
    name='tandoor-cli',
    defaults=dict(
        user=user,
        client_type=Application.CLIENT_CONFIDENTIAL,
        authorization_grant_type=Application.GRANT_PASSWORD,
    )
)

token = AccessToken.objects.create(
    user=user,
    application=app,
    token=secrets.token_hex(20),
    expires=timezone.now() + timedelta(days=3650),
    scope='read write',
)
print('ACCESS TOKEN:', token.token)
"
```

Replace `<your-container-name>` with the name of your running Tandoor Docker container and `YOUR_USERNAME` with your Tandoor username. Copy the printed token into `TANDOOR_API_TOKEN`.

> The token is valid for 10 years. To regenerate, run the command again — it will reuse the existing `tandoor-cli` OAuth2 app.

### Username / Password (fallback)

If `TANDOOR_API_TOKEN` is not set, the CLI falls back to HTTP Basic Authentication using `TANDOOR_USERNAME` and `TANDOOR_PASSWORD`. The API token is preferred because it does not expose your password and can be revoked independently.

---

## Commands

### `tandoor configure`

Interactively save your Tandoor URL and API token to `~/.config/tandoor-cli/config.json`.

```bash
npx tandoor-cli configure
```

---

### Recipes

#### `tandoor list`

List recipes, sorted by most recently created.

```bash
tandoor list                  # default: 20 recipes
tandoor list --limit 50       # up to 100 (values above 100 are capped)
tandoor list --json           # output raw JSON
```

#### `tandoor search <query>`

Search recipes by keyword.

```bash
tandoor search pasta
tandoor search "chicken soup" --json
```

#### `tandoor get <id>`

Get full details of a recipe: name, description, servings, times, ingredients, and steps.

```bash
tandoor get 42
tandoor get 42 --json
```

#### `tandoor random`

Retrieve a random recipe.

```bash
tandoor random
tandoor random --json
```

#### `tandoor add`

Create a new recipe interactively or from a JSON file.

```bash
# Interactive prompts
tandoor add

# From a JSON file
tandoor add --json recipe.json
```

Example `recipe.json`:

```json
{
  "name": "Simple Pasta",
  "description": "Quick weeknight dinner",
  "servings": 2,
  "working_time": 10,
  "waiting_time": 15,
  "steps": [
    {
      "instruction": "Boil pasta until al dente.",
      "order": 0,
      "ingredients": [
        { "food": { "name": "pasta" }, "unit": { "name": "g" }, "amount": 200 }
      ]
    }
  ]
}
```

#### `tandoor update <id> --json <file>`

Patch an existing recipe with fields from a JSON file.

```bash
tandoor update 42 --json patch.json
```

`patch.json` only needs to include the fields you want to change.

#### `tandoor delete <id>`

Delete a recipe. Prompts for confirmation unless `--force` is passed.

```bash
tandoor delete 42
tandoor delete 42 --force   # skip confirmation
```

#### `tandoor import <url>`

Import a recipe directly from a URL using Tandoor's built-in scraper. Supports hundreds of recipe sites.

```bash
tandoor import https://www.bbcgoodfood.com/recipes/easy-chocolate-cake
tandoor import https://www.seriouseats.com/the-best-pizza-dough-recipe --json
tandoor import https://www.bbcgoodfood.com/recipes/easy-chocolate-cake --dry-run
```

- `--dry-run` — scrapes and previews the recipe without saving it to Tandoor
- `--json` — outputs the created (or previewed) recipe as raw JSON
- If the scraper detects a possible duplicate already in your collection, a warning is printed to stderr but the import still proceeds.

---

### Meal Plans

#### `tandoor mealplan list`

List all meal plan entries. Optionally filter by date range.

```bash
tandoor mealplan list
tandoor mealplan list --json
tandoor mealplan list --startdate 2026-06-01
tandoor mealplan list --enddate 2026-06-08
tandoor mealplan list --startdate 2026-06-01 --enddate 2026-06-08
```

- `--startdate <YYYY-MM-DD>` — only return entries on or after this date
- `--enddate <YYYY-MM-DD>` — only return entries on or before this date

#### `tandoor mealplan add`

Add a meal plan entry.

```bash
tandoor mealplan add --recipe 42 --date 2024-12-25 --meal-type 1
```

Date must be in `YYYY-MM-DD` format.

#### `tandoor mealplan delete <id>`

Delete a meal plan entry by ID.

```bash
tandoor mealplan delete 7
```

---

### Shopping List

#### `tandoor shopping list`

List all shopping list entries.

```bash
tandoor shopping list
tandoor shopping list --json
```

#### `tandoor shopping add`

Add an item to the shopping list.

```bash
tandoor shopping add --food flour --amount 500 --unit g
tandoor shopping add --food milk --amount 1 --unit liter
```

#### `tandoor shopping check [id]`

Mark a shopping list entry as checked, or check all entries at once with `--all`.

```bash
tandoor shopping check 3        # check a single entry by ID
tandoor shopping check --all    # check every unchecked entry
tandoor shopping check --all --json
```

#### `tandoor shopping clear`

Delete all checked entries. Prompts for confirmation unless `--force` is passed.

```bash
tandoor shopping clear
tandoor shopping clear --force
```

---

### Households & Users

Tandoor uses **households** to organize users and recipes. A household is a shared space where multiple users can collaborate. Users are added to households via **invite links** — you cannot create users directly, but you can generate invite links and send them to people.

> **Note:** Household management endpoints (`household`, `invite-link`) require special permissions in Tandoor. The CLI will attempt to read household data through the user-space endpoint if the direct endpoint is restricted. For write operations (create, edit, delete, invite), you may need admin/staff privileges. If you receive a "Permission denied (403)" error on write operations, contact your Tandoor administrator.

#### `tandoor household list`

List all households in the space. If you don't have direct access to the household endpoint, this will extract households from user-space memberships.

```bash
tandoor household list
tandoor household list --json
```

#### `tandoor household get <id>`

Get details of a household by ID (requires admin privileges).

```bash
tandoor household get 1
tandoor household get 1 --json
```

#### `tandoor household add <name>`

Create a new household (requires admin privileges).

```bash
tandoor household add "My Family"
tandoor household add "Roommates" --json
```

#### `tandoor household edit <id>`

Rename a household (requires admin privileges).

```bash
tandoor household edit 1 --name "Updated Name"
tandoor household edit 1 --name "New Household Name" --json
```

#### `tandoor household delete <id>`

Delete a household (requires admin privileges). Prompts for confirmation unless `--force` is passed.

```bash
tandoor household delete 1
tandoor household delete 1 --force
```

#### `tandoor household users list`

List all users in the space.

```bash
tandoor household users list
tandoor household users list --json
```

#### `tandoor household users memberships`

List all user-space memberships, showing which household each user belongs to.

```bash
tandoor household users memberships
tandoor household users memberships --json
```

#### `tandoor household users assign <user-space-id> <household-id>`

Assign a user (by their user-space ID) to a different household (requires admin privileges).

```bash
tandoor household users assign 2 1
tandoor household users assign 2 1 --json
```

To find the user-space ID, run `tandoor household users memberships` and look for the `[id]` column.

#### `tandoor household invite list`

List all invite links (requires admin privileges).

```bash
tandoor household invite list
tandoor household invite list --json
```

#### `tandoor household invite create <household-id>`

Create an invite link for a household. **Requires space owner authentication.**

> **Important:** This command requires authentication as the **space owner** (the user who created the Tandoor space). Even if you're a superuser or staff member, you must use the space owner's token to create invite links. Other users will receive a 403 Permission Denied error.

```bash
tandoor household invite create 1
tandoor household invite create 1 --email user@example.com
tandoor household invite create 1 --expires 2026-12-31
tandoor household invite create 1 --group-id 2
tandoor household invite create 1 --email user@example.com --expires 2026-12-31 --json
```

- `--email <email>` — pre-fill the invitee's email address
- `--expires <YYYY-MM-DD>` — set an expiry date for the link
- `--group-id <id>` — assign the new user to a group by ID (default: 2 for "user" group; use 3 for "admin")
- `--json` — output the created link as raw JSON

The generated URL is printed to stdout and can be shared directly. The invitee visits the link, registers, and is automatically added to the household.

#### `tandoor household invite delete <id>`

Delete an invite link (requires admin privileges). Prompts for confirmation unless `--force` is passed.

```bash
tandoor household invite delete 1
tandoor household invite delete 1 --force
```

---

### Food Ingredients

#### `tandoor food list`

List food ingredients, with optional search, limit, and ignore filter.

```bash
tandoor food list                           # default: 20 items
tandoor food list --limit 10                # return up to 10 items
tandoor food list --search butter           # filter by search term
tandoor food list --limit 10 --search butter
tandoor food list --ignored                 # only foods with ignore_shopping set
tandoor food list --ignored --search butter # combine filters
tandoor food list --json                    # output raw JSON
```

- `--limit <n>` — maximum number of results (default 20)
- `--search <term>` — filter results by keyword
- `--ignored` — only show foods that are on the ignore-shopping list
- `--json` — output raw JSON

Each row shows the food ID, name, and any active flags (`ignore-shopping`, `on-hand`).

#### `tandoor food edit <id-or-name>`

Edit a food ingredient's properties. Accepts either a numeric ID or an exact name (case-insensitive).

```bash
tandoor food edit butter --ignore-shopping true
tandoor food edit 42 --ignore-shopping false
tandoor food edit "olive oil" --ignore-shopping true --json
```

- `--ignore-shopping <true|false>` — set whether this food is excluded from shopping lists
- `--json` — output the updated food as raw JSON

#### `tandoor food ignore <id-or-name>`

Set or clear the `ignore_shopping` flag. Accepts either a numeric ID or an exact name (case-insensitive).

```bash
tandoor food ignore butter           # set ignore_shopping = true
tandoor food ignore 42               # same, by ID
tandoor food ignore butter --unset   # clear the flag
```

- `--unset` — clear the flag (re-enable shopping for this food)
- `--json` — output the updated food as raw JSON

#### `tandoor food onhand <id-or-name>`

Mark a food as on hand (in your pantry) or clear that flag. Accepts either a numeric ID or an exact name (case-insensitive).

```bash
tandoor food onhand eggs
tandoor food onhand 17
tandoor food onhand eggs --unset
```

- `--unset` — clear the on-hand flag
- `--json` — output the updated food as raw JSON

---

## Agent Skills

This repository includes an [Agent Skills](https://agentskills.io/) package that enables AI agents (like Kiro, Claude, or other compatible tools) to interact with Tandoor via the CLI.

### Using the skill in Kiro

1. Open the **Agent Steering & Skills** section in the Kiro panel
2. Click **+** and select **Import a skill**
3. Choose **GitHub** and paste this URL:
   ```
   https://github.com/dcenatiempo/tandoor-cli
   ```
4. The skill will be imported and available immediately

Alternatively, you can import directly to a specific skill folder:
```
https://github.com/dcenatiempo/tandoor-cli/tree/main/skills/tandoor-recipe-cli
```

### Using the skill in other tools

The skill follows the open Agent Skills specification and can be imported into any compatible AI tool. The skill files are located in `skills/tandoor-recipe-cli/`.

---

## Development

Install dependencies and build:

```bash
git clone https://github.com/dcenatiempo/tandoor-cli.git
cd tandoor-cli
npm install
npm run build
```

Run unit tests:

```bash
npm test
```

Run integration tests against a live Tandoor instance (requires `TANDOOR_URL` and auth configured):

```bash
TANDOOR_INTEGRATION=true npm test
```

Integration tests are skipped unless `TANDOOR_INTEGRATION=true` is set.

---

## Contributing / Release Process

1. Bump the version in `package.json` following [semver](https://semver.org).
2. Run `npm run build` to compile TypeScript to `dist/`.
3. Run `npm test` to confirm all tests pass.
4. Run `npm publish` to publish to the npm registry (`prepublishOnly` will run the build automatically).

---

## License

MIT
