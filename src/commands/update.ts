import { Command } from 'commander';
import * as fs from 'fs';
import { updateRecipe } from '../api/recipes';
import { printSuccess, printError } from '../output/formatter';
import { RecipeCreatePayload } from '../api/types';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update <id>')
    .description('Update a recipe by ID using a JSON patch file')
    .requiredOption('--json <file>', 'JSON file containing fields to update')
    .action(async (id: string, opts) => {
      try {
        const raw = fs.readFileSync(opts.json, 'utf-8');
        const patch = JSON.parse(raw) as Partial<RecipeCreatePayload>;
        const recipe = await updateRecipe(parseInt(id, 10), patch);
        printSuccess(`Updated recipe #${recipe.id}: ${recipe.name}`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
