import { Command } from 'commander';
import { getRecipe } from '../api/recipes';
import { recipeToCreatePayload } from '../api/recipe-payload';
import { formatRecipe, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

export function registerGetCommand(program: Command): void {
  addFormatOption(
    program
      .command('get <id>')
      .description('Get full details of a recipe by ID'),
  ).action(async (id: string, opts) => {
    try {
      const recipe = await getRecipe(parseInt(id, 10));
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => formatRecipe(recipe),
        json: () => recipeToCreatePayload(recipe),
        api: () => recipe,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
