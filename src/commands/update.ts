import { Command } from 'commander';
import * as fs from 'fs';
import { updateRecipe } from '../api/recipes';
import { printSuccess, printError } from '../output/formatter';
import { resolveInputFile } from '../output/format-option';
import { RecipeCreatePayload } from '../api/types';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update <id>')
    .description('Update a recipe by ID using a JSON patch file')
    .option('--file <path>', 'JSON file containing fields to update')
    .option('--json <path>', 'Deprecated: use --file')
    .action(async (id: string, opts) => {
      try {
        const path = resolveInputFile(opts);
        if (!path) {
          printError('Missing required option: --file <path>');
          process.exit(1);
        }

        const raw = fs.readFileSync(path, 'utf-8');
        const patch = JSON.parse(raw) as Partial<RecipeCreatePayload>;
        const recipe = await updateRecipe(parseInt(id, 10), patch);
        printSuccess(`Updated recipe #${recipe.id}: ${recipe.name}`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
