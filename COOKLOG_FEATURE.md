# Cook Log Feature

## Overview
Added cook log functionality to the Tandoor CLI tool. Cook logs allow users to track when they cook recipes, including servings made and optional ratings.

## API Endpoint
- **Endpoint**: `POST /api/cook-log/`
- **Methods**: Create and Update (both use POST with optional `id` field)

## Implementation

### Files Added/Modified

1. **tandoor-cli/src/api/types.ts**
   - Added `CookLog` interface

2. **tandoor-cli/src/api/cooklog.ts** (new)
   - `listCookLogs()` - List cook log entries with optional filters (recipe, limit, startdate, enddate, minRating, maxRating)
   - Results are sorted by created_at descending (most recent first)
   - Rating filters applied client-side
   - `createCookLog()` - Create a new cook log entry
   - `updateCookLog()` - Update an existing cook log entry (includes `id` in payload)
   - `deleteCookLog()` - Delete a cook log entry
   - `findCookLogsByIngredient()` - Find cook logs containing a specific ingredient
     - Fetches cook logs, then retrieves each recipe to check ingredients
     - Returns cook logs with recipe names included
     - Supports date range and rating filtering

3. **tandoor-cli/src/commands/cooklog.ts** (new)
   - `cooklog list` - List cook log entries (sorted by most recent first)
     - Supports filtering by recipe ID, date range (startdate/enddate), rating range (min-rating/max-rating), and limit
     - Validates date format (YYYY-MM-DD) and rating values (1-5)
     - Ensures min-rating ≤ max-rating
   - `cooklog ingredient <name>` - Find cook logs by ingredient name
     - Searches through cook logs and checks recipes for matching ingredients
     - Shows most recent occurrence and count summary with applied filters
     - Supports date range and rating filtering
     - Enhanced output showing rating filters in summary
   - `cooklog add` - Add a new cook log entry
   - `cooklog update <id>` - Update an existing cook log entry
   - `cooklog delete <id>` - Delete a cook log entry

4. **tandoor-cli/src/cli.ts**
   - Registered the `cooklog` command

5. **AGENTS.md**
   - Added cook log commands to the command reference table
   - Added cook log commands to security approval requirements

## Usage Examples

### List cook logs
```bash
tandoor cooklog list
tandoor cooklog list --recipe 1
tandoor cooklog list --limit 50
tandoor cooklog list --startdate 2026-04-01
tandoor cooklog list --enddate 2026-04-30
tandoor cooklog list --startdate 2026-04-01 --enddate 2026-04-30
tandoor cooklog list --min-rating 4              # only 4-5 star ratings
tandoor cooklog list --max-rating 2              # only 1-2 star ratings
tandoor cooklog list --min-rating 4 --max-rating 4  # exactly 4 stars
tandoor cooklog list --json
```

**Note:** Results are always sorted from most recent to oldest.

### Find cook logs by ingredient
```bash
tandoor cooklog ingredient eggs
tandoor cooklog ingredient "chicken breast"
tandoor cooklog ingredient eggs --limit 50
tandoor cooklog ingredient eggs --startdate 2026-04-01 --enddate 2026-04-30
tandoor cooklog ingredient eggs --min-rating 4   # highly-rated egg recipes
tandoor cooklog ingredient eggs --max-rating 2   # poorly-rated egg recipes
tandoor cooklog ingredient eggs --json
```

This command answers questions like:
- "When is the last time we had eggs?"
- "How many times did we have chicken last month?"
- "What are all my egg recipes with at least a 4 star rating?"
- "What were our least liked recipes from last month (1 or 2 stars)?"

The command searches through cook logs and checks each recipe for the specified ingredient (case-insensitive, partial match).

### Add a cook log entry
```bash
tandoor cooklog add --recipe 1 --servings 8
tandoor cooklog add --recipe 1 --servings 8 --rating 4
tandoor cooklog add --recipe 1 --servings 8 --rating 4 --date "2026-04-27T04:00:00.000Z"
```

### Update a cook log entry
```bash
tandoor cooklog update 2 --recipe 1 --servings 8 --rating 5
tandoor cooklog update 2 --recipe 1 --servings 8 --rating 5 --date "2026-04-27T04:00:00.000Z"
```

### Delete a cook log entry
```bash
tandoor cooklog delete 2
```

## Security Classification

- **Read operations** (no approval needed): `cooklog list`, `cooklog ingredient`
- **Write operations** (user confirmation): `cooklog add`, `cooklog update`
- **Destructive operations** (explicit confirmation): `cooklog delete`

## Payload Format

### Create
```json
{
  "recipe": 1,
  "servings": 8,
  "rating": 4,
  "created_at": "2026-04-27T04:00:00.000Z"
}
```

### Update
```json
{
  "id": 2,
  "recipe": 1,
  "servings": 8,
  "rating": 4,
  "created_at": "2026-04-27T04:00:00.000Z"
}
```

Note: The `rating` and `created_at` fields are optional in both cases.
