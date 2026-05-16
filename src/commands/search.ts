import { Command } from 'commander';
import { searchRecipes } from '../api/recipes';
import { recipeToCreatePayload } from '../api/recipe-payload';
import { formatRecipeList, printError, printSuccess } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

export function registerSearchCommand(program: Command): void {
  addFormatOption(
    program.command('search <query>').description('Search recipes by keyword'),
  ).action(async (query: string, opts) => {
    try {
      const recipes = await searchRecipes(query);
      const format = resolveFormat(opts);
      if (format === 'text' && recipes.length === 0) {
        printSuccess(`No recipes matched "${query}".`);
        return;
      }
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
