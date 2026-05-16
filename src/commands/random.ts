import { Command } from 'commander';
import { randomRecipe } from '../api/recipes';
import { recipeToCreatePayload } from '../api/recipe-payload';
import { formatRecipe, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

export function registerRandomCommand(program: Command): void {
  addFormatOption(
    program.command('random').description('Get a random recipe'),
  ).action(async (opts) => {
    try {
      const recipe = await randomRecipe();
      if (!recipe) {
        console.log('No recipes available.');
        return;
      }
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
