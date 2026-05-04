import { Command } from 'commander';
import * as readline from 'readline';
import {
  listShoppingEntries,
  createShoppingEntry,
  checkShoppingEntry,
  checkAllShoppingEntries,
  clearCheckedEntries,
  addMealPlanIngredientsToShopping,
} from '../api/shopping';
import { formatShoppingList, printJson, printSuccess, printError } from '../output/formatter';
import { isValidDate } from '../utils';

async function confirmClear(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    printError('stdin is not a TTY. Use --force to skip confirmation.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Clear all checked items? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}
export function registerShoppingCommand(program: Command): void {
  const shopping = program
    .command('shopping')
    .description('Manage shopping list');

  // shopping list
  shopping
    .command('list')
    .description('List all shopping list entries')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const entries = await listShoppingEntries();
        if (opts.json) {
          printJson(entries);
        } else {
          formatShoppingList(entries);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // shopping add
  shopping
    .command('add')
    .description('Add an item to the shopping list, or add all ingredients from a meal plan date range')
    .option('--food <name>', 'Food name (required without --mealplan)')
    .option('--amount <n>', 'Amount (required without --mealplan)')
    .option('--unit <unit>', 'Unit name', '')
    .option('--mealplan', 'Add all ingredients from meal plan entries in the given date range')
    .option('--startdate <YYYY-MM-DD>', 'Start date for meal plan range (required with --mealplan)')
    .option('--enddate <YYYY-MM-DD>', 'End date for meal plan range (required with --mealplan)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        if (opts.mealplan) {
          // Meal plan mode: add all ingredients from the date range
          if (!opts.startdate || !opts.enddate) {
            printError('--startdate and --enddate are required when using --mealplan.');
            process.exit(1);
          }
          if (!isValidDate(opts.startdate)) {
            printError(`Invalid --startdate format "${opts.startdate}". Expected YYYY-MM-DD.`);
            process.exit(1);
          }
          if (!isValidDate(opts.enddate)) {
            printError(`Invalid --enddate format "${opts.enddate}". Expected YYYY-MM-DD.`);
            process.exit(1);
          }

          const { added, skipped } = await addMealPlanIngredientsToShopping(opts.startdate, opts.enddate);

          if (opts.json) {
            printJson({ added: added.map((a) => a.entry), skipped });
          } else if (added.length === 0 && skipped.length === 0) {
            console.log('No meal plan entries found in the given date range.');
          } else {
            if (added.length > 0) {
              printSuccess(`Added ${added.length} ingredient(s) to the shopping list.`);
              added.forEach((a) => {
                const parts = [a.amount !== 0 ? String(a.amount) : '', a.unit, a.food]
                  .filter(Boolean)
                  .join(' ');
                console.log(`  • ${parts}`);
              });
            } else {
              console.log('No ingredients added (all were skipped).');
            }
            if (skipped.length > 0) {
              console.log(`\nSkipped ${skipped.length} ingredient(s):`);
              skipped.forEach((s) => {
                const reason = s.reason === 'food_onhand' ? 'on hand' : 'ignore shopping';
                console.log(`  ⊘ ${s.food}  (${reason})`);
              });
            }
          }
        } else {
          // Single item mode
          if (!opts.food || !opts.amount) {
            printError('--food and --amount are required (or use --mealplan with --startdate and --enddate).');
            process.exit(1);
          }
          const entry = await createShoppingEntry(
            opts.food,
            parseFloat(opts.amount),
            opts.unit,
          );
          if (opts.json) {
            printJson(entry);
          } else {
            printSuccess(`Added "${entry.food.name}" to shopping list (entry #${entry.id}).`);
          }
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // shopping check
  shopping
    .command('check [id]')
    .description('Mark a shopping list entry as checked, or all entries with --all')
    .option('--all', 'Check all shopping list entries')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, opts) => {
      try {
        if (opts.all) {
          const entries = await checkAllShoppingEntries();
          if (opts.json) {
            printJson(entries);
          } else if (entries.length === 0) {
            console.log('No unchecked items found.');
          } else {
            printSuccess(`Checked off ${entries.length} item(s).`);
          }
        } else if (id) {
          const entry = await checkShoppingEntry(parseInt(id, 10));
          if (opts.json) {
            printJson(entry);
          } else {
            printSuccess(`Checked off "${entry.food.name}" (entry #${entry.id}).`);
          }
        } else {
          printError('Provide an entry <id> or use --all to check everything.');
          process.exit(1);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // shopping clear
  shopping
    .command('clear')
    .description('Clear all checked shopping list entries (requires --force or --interactive)')
    .option('--force', 'Skip confirmation and clear immediately')
    .option('--interactive', 'Prompt for confirmation before clearing')
    .action(async (opts) => {
      try {
        if (opts.force) {
          // non-interactive: proceed without confirmation
        } else if (opts.interactive) {
          const ok = await confirmClear();
          if (!ok) {
            console.log('Aborted.');
            return;
          }
        } else {
          printError('Refusing to clear without explicit confirmation. Use --force to clear immediately, or --interactive to be prompted.');
          process.exit(1);
        }
        await clearCheckedEntries();
        printSuccess('Cleared all checked shopping list entries.');
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
