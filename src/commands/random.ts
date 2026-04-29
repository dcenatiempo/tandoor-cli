import { Command } from 'commander';
import { randomRecipe } from '../api/recipes';
import { formatRecipe, printJson, printError } from '../output/formatter';

export function registerRandomCommand(program: Command): void {
  program
    .command('random')
    .description('Get a random recipe')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const recipe = await randomRecipe();
        if (!recipe) {
          console.log('No recipes available.');
          return;
        }
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
