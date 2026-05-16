import { Command } from 'commander';
import { listRecipes } from '../api/recipes';
import { recipeToCreatePayload } from '../api/recipe-payload';
import { formatRecipeList, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
import { capLimit } from '../utils';

export function registerListCommand(program: Command): void {
  addFormatOption(
    program
      .command('list')
      .description('List recipes')
      .option('-l, --limit <n>', 'Results per page', '20')
      .option('--page <n>', 'Page number when using --limit (default 1)', '1')
      .option('--all', 'Return every recipe (ignores --limit and --page)'),
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
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => formatRecipeList(recipes),
        json: () => recipes.map(recipeToCreatePayload),
        api: () => recipes,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
