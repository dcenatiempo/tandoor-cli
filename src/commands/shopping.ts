import { Command } from 'commander';
import * as readline from 'readline';
import {
  listShoppingEntries,
  createShoppingEntry,
  checkShoppingEntry,
  checkAllShoppingEntries,
  clearCheckedEntries,
} from '../api/shopping';
import { formatShoppingList, printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

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

  addFormatOption(
    shopping.command('list').description('List all shopping list entries'),
  ).action(async (opts) => {
    try {
      const entries = await listShoppingEntries();
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => formatShoppingList(entries),
        json: () => entries,
        api: () => entries,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    shopping
      .command('add')
      .description('Add an item to the shopping list')
      .option('--food <name>', 'Food name (required)')
      .option('--amount <n>', 'Amount (required)')
      .option('--unit <unit>', 'Unit name', ''),
  ).action(async (opts) => {
    try {
      if (!opts.food || !opts.amount) {
        printError('--food and --amount are required.');
        process.exit(1);
      }
      const entry = await createShoppingEntry(
        opts.food,
        parseFloat(opts.amount),
        opts.unit,
      );
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => printSuccess(`Added "${entry.food.name}" to shopping list (entry #${entry.id}).`),
        json: () => entry,
        api: () => entry,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    shopping
      .command('check [id]')
      .description('Mark a shopping list entry as checked, or all entries with --all')
      .option('--all', 'Check all shopping list entries'),
  ).action(async (id: string | undefined, opts) => {
    try {
      if (opts.all) {
        const entries = await checkAllShoppingEntries();
        const format = resolveFormat(opts);
        if (format === 'text' && entries.length === 0) {
          console.log('No unchecked items found.');
          return;
        }
        emitOutput(format, {
          text: () => printSuccess(`Checked off ${entries.length} item(s).`),
          json: () => entries,
          api: () => entries,
        });
      } else if (id) {
        const entry = await checkShoppingEntry(parseInt(id, 10));
        const format = resolveFormat(opts);
        emitOutput(format, {
          text: () => printSuccess(`Checked off "${entry.food.name}" (entry #${entry.id}).`),
          json: () => entry,
          api: () => entry,
        });
      } else {
        printError('Provide an entry <id> or use --all to check everything.');
        process.exit(1);
      }
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

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
          printError(
            'Refusing to clear without explicit confirmation. Use --force to clear immediately, or --interactive to be prompted.',
          );
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
