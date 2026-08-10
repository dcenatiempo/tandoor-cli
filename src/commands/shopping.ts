import { Command } from 'commander';
import * as readline from 'readline';
import {
  listShoppingEntries,
  createShoppingEntry,
  checkShoppingEntry,
  checkAllShoppingEntries,
  clearCheckedEntries,
  deleteShoppingEntry,
  selectShoppingEntriesForDelete,
} from '../api/shopping';
import { toShoppingListPayload } from '../api/shopping-payload';
import { formatShoppingList, printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    printError('stdin is not a TTY. Use --force to skip confirmation.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
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
        json: () => toShoppingListPayload(entries),
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

  addFormatOption(
    shopping
      .command('delete [id]')
      .description(
        'Delete a single shopping list entry by ID or --food name (requires --force or --interactive)',
      )
      .option('--food <name>', 'Delete by food name instead of ID')
      .option('--force', 'Skip confirmation and delete immediately')
      .option('--interactive', 'Prompt for confirmation before deleting'),
  ).action(async (id: string | undefined, opts) => {
    try {
      if (!id && !opts.food) {
        printError('Provide an entry <id> or --food <name>.');
        process.exit(1);
      }
      if (id && opts.food) {
        printError('Provide either an entry <id> or --food <name>, not both.');
        process.exit(1);
      }

      const entries = await listShoppingEntries();
      const matches = selectShoppingEntriesForDelete(
        entries,
        id ? { id: parseInt(id, 10) } : { food: opts.food },
      );

      if (matches.length === 0) {
        printError(
          id
            ? `No shopping list entry with ID ${id}.`
            : `"${opts.food}" is not on the shopping list.`,
        );
        process.exit(1);
      }
      if (matches.length > 1) {
        // Only reachable via --food. Deleting the wrong row cannot be undone,
        // so name the candidates and let the caller pick an ID.
        printError(
          `${matches.length} entries match "${opts.food}". Delete one by ID:\n` +
            matches.map((e) => `  ${e.id}  ${e.amount} ${e.unit?.name ?? ''} ${e.food.name}`.replace(/\s+/g, ' ')).join('\n'),
        );
        process.exit(1);
      }

      const target = matches[0];

      if (opts.force) {
        // non-interactive: proceed without confirmation
      } else if (opts.interactive) {
        const ok = await confirm(`Delete "${target.food.name}" (entry #${target.id})? (y/N): `);
        if (!ok) {
          console.log('Aborted.');
          return;
        }
      } else {
        printError(
          'Refusing to delete without explicit confirmation. Use --force to delete immediately, or --interactive to be prompted.',
        );
        process.exit(1);
      }

      await deleteShoppingEntry(target.id);
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => printSuccess(`Deleted "${target.food.name}" (entry #${target.id}).`),
        json: () => target,
        api: () => target,
      });
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
          const ok = await confirm('Clear all checked items? (y/N): ');
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
