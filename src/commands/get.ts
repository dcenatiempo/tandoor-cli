import { Command } from 'commander';
import { getRecipe } from '../api/recipes';
import { formatRecipe, printJson, printError } from '../output/formatter';

export function registerGetCommand(program: Command): void {
  program
    .command('get <id>')
    .description('Get full details of a recipe by ID')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts) => {
      try {
        const recipe = await getRecipe(parseInt(id, 10));
        if (opts.json) {
          printJson(recipe);
        } else {
          formatRecipe(recipe);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
