import { Command } from 'commander';
import { listRecipes } from '../api/recipes';
import { formatRecipeList, printJson, printError } from '../output/formatter';
import { capLimit } from '../utils';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List recipes')
    .option('-l, --limit <n>', 'Number of recipes to show', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const limit = capLimit(parseInt(opts.limit, 10));
        const recipes = await listRecipes(limit);
        if (opts.json) {
          printJson(recipes);
        } else {
          formatRecipeList(recipes);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
