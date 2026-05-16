import { Command } from 'commander';
import { listFoods, getFoodByName, getFoodById, patchFood } from '../api/food';
import { foodsToListPayload } from '../api/food-payload';
import { formatFoodList, printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
import { Food } from '../api/types';

async function resolveFood(idOrName: string): Promise<Food | null> {
  const numericId = parseInt(idOrName, 10);
  if (!isNaN(numericId) && String(numericId) === idOrName) {
    return getFoodById(numericId);
  }
  return getFoodByName(idOrName);
}

export function registerFoodCommand(program: Command): void {
  const food = program
    .command('food')
    .description('Manage food ingredients');

  addFormatOption(
    food
      .command('list')
      .description('List food ingredients')
      .option('--limit <n>', 'Results per page (default 20)', '20')
      .option('--page <n>', 'Page number when using --limit (default 1)', '1')
      .option('--all', 'Return every matching food (ignores --limit and --page)')
      .option('--search <term>', 'Filter by search term')
      .option('--ignored', 'Only show foods with ignore_shopping set')
      .option('--onhand', 'Only show foods marked as on hand'),
  ).action(async (opts) => {
    try {
      if (opts.all) {
        const page = parseInt(opts.page, 10);
        if (!isNaN(page) && page > 1) {
          printError('--all cannot be used with --page greater than 1.');
          process.exit(1);
        }
      }

      let limit: number | undefined;
      if (!opts.all) {
        limit = parseInt(opts.limit, 10);
        if (isNaN(limit) || limit < 1) {
          printError('--limit must be a positive integer.');
          process.exit(1);
        }
      }

      let page: number | undefined;
      if (!opts.all) {
        page = parseInt(opts.page, 10);
        if (isNaN(page) || page < 1) {
          printError('--page must be a positive integer.');
          process.exit(1);
        }
      }

      const foods = await listFoods({
        fetchAll: Boolean(opts.all),
        limit,
        page,
        search: opts.search,
        ignoredOnly: opts.ignored,
        onhandOnly: opts.onhand,
      });

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => formatFoodList(foods),
        json: () => foodsToListPayload(foods),
        api: () => foods,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    food
      .command('edit <id-or-name>')
      .description("Edit a food ingredient's properties")
      .option('--ignore-shopping <bool>', 'Set ignore_shopping to true or false'),
  ).action(async (idOrName: string, opts) => {
    try {
      if (opts.ignoreShopping === undefined) {
        printError('Nothing to update. Use --ignore-shopping <true|false>.');
        process.exit(1);
      }

      const found = await resolveFood(idOrName);
      if (!found) {
        printError(`Food "${idOrName}" not found. Check the name or ID and try again.`);
        process.exit(1);
      }

      const val = opts.ignoreShopping.toLowerCase();
      if (val !== 'true' && val !== 'false') {
        printError('--ignore-shopping must be "true" or "false".');
        process.exit(1);
      }

      const updated = await patchFood(found.id, { ignore_shopping: val === 'true' });

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          const ignoreLabel = updated.ignore_shopping
            ? 'will be ignored in shopping lists'
            : 'will be included in shopping lists';
          printSuccess(`"${updated.name}" updated — ${ignoreLabel}.`);
        },
        json: () => updated,
        api: () => updated,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    food
      .command('ignore <id-or-name>')
      .description('Set or clear the ignore_shopping flag on a food item')
      .option('--unset', 'Clear the ignore_shopping flag (re-enable shopping)'),
  ).action(async (idOrName: string, opts) => {
    try {
      const found = await resolveFood(idOrName);
      if (!found) {
        printError(`Food "${idOrName}" not found. Check the name or ID and try again.`);
        process.exit(1);
      }

      const ignore = !opts.unset;
      const updated = await patchFood(found.id, { ignore_shopping: ignore });

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          if (ignore) {
            printSuccess(`"${updated.name}" will now be ignored when building shopping lists.`);
          } else {
            printSuccess(`"${updated.name}" will now be included when building shopping lists.`);
          }
        },
        json: () => updated,
        api: () => updated,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    food
      .command('onhand <id-or-name>')
      .description('Mark a food as on hand (in your pantry) or clear that flag')
      .option('--unset', 'Clear the on-hand flag'),
  ).action(async (idOrName: string, opts) => {
    try {
      const found = await resolveFood(idOrName);
      if (!found) {
        printError(`Food "${idOrName}" not found. Check the name or ID and try again.`);
        process.exit(1);
      }

      const onhand = !opts.unset;
      const updated = await patchFood(found.id, { food_onhand: onhand });

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          if (onhand) {
            printSuccess(
              `"${updated.name}" marked as on hand — it will be skipped when building shopping lists.`,
            );
          } else {
            printSuccess(
              `"${updated.name}" on-hand flag cleared — it will be included when building shopping lists.`,
            );
          }
        },
        json: () => updated,
        api: () => updated,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
