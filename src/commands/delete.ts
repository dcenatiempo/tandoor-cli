import { Command } from 'commander';
import * as readline from 'readline';
import { deleteRecipe } from '../api/recipes';
import { printSuccess, printError } from '../output/formatter';

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

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('Delete a recipe by ID (requires --force or --interactive)')
    .option('--force', 'Skip confirmation and delete immediately')
    .option('--interactive', 'Prompt for confirmation before deleting')
    .action(async (id: string, opts) => {
      try {
        const recipeId = parseInt(id, 10);

        if (opts.force) {
          // non-interactive: proceed without confirmation
        } else if (opts.interactive) {
          const ok = await confirm(`Delete recipe ${recipeId}? (y/N): `);
          if (!ok) {
            console.log('Aborted.');
            return;
          }
        } else {
          printError('Refusing to delete without explicit confirmation. Use --force to delete immediately, or --interactive to be prompted.');
          process.exit(1);
        }

        await deleteRecipe(recipeId);
        printSuccess(`Deleted recipe #${recipeId}.`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
