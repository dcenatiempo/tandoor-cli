import { Command } from 'commander';
import { searchRecipes } from '../api/recipes';
import { formatRecipeList, printJson, printError, printSuccess } from '../output/formatter';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search recipes by keyword')
    .option('--json', 'Output as JSON')
    .action(async (query: string, opts) => {
      try {
        const recipes = await searchRecipes(query);
        if (opts.json) {
          printJson(recipes);
        } else if (recipes.length === 0) {
          printSuccess(`No recipes matched "${query}".`);
        } else {
          formatRecipeList(recipes);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
