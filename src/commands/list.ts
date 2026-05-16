import { Command } from 'commander';
import { listRecipes } from '../api/recipes';
import { formatRecipeList, printJson, printError } from '../output/formatter';
import { capLimit } from '../utils';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List recipes')
    .option('-l, --limit <n>', 'Results per page', '20')
    .option('--page <n>', 'Page number when using --limit (default 1)', '1')
    .option('--all', 'Return every recipe (ignores --limit and --page)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
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
          limit = capLimit(parseInt(opts.limit, 10));
        }

        let page: number | undefined;
        if (!opts.all) {
          page = parseInt(opts.page, 10);
          if (isNaN(page) || page < 1) {
            printError('--page must be a positive integer.');
            process.exit(1);
          }
        }

        const recipes = await listRecipes({
          fetchAll: Boolean(opts.all),
          limit,
          page,
        });
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
