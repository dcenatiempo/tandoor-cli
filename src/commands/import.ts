import { Command } from 'commander';
import { scrapeRecipeFromUrl, createRecipe, setRecipeImageFromUrl } from '../api/recipes';
import { recipeToCreatePayload } from '../api/recipe-payload';
import { printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
export function registerImportCommand(program: Command): void {
  addFormatOption(
    program
      .command('import <url>')
      .description("Import a recipe from a URL using Tandoor's built-in scraper")
      .option('--dry-run', 'Scrape and preview the recipe without saving it'),
  ).action(async (url: string, opts) => {
    try {
      const result = await scrapeRecipeFromUrl(url);

      if (result.error || !result.recipe) {
        printError(`Failed to scrape recipe: ${result.msg || 'Unknown error'}`);
        process.exit(1);
      }

      if (result.duplicates.length > 0) {
        const dupeList = result.duplicates.map(d => `  #${d.id}: ${d.name}`).join('\n');
        process.stderr.write(`Warning: possible duplicates found:\n${dupeList}\n`);
      }

      // Normalize null `order` fields on ingredients — Tandoor's scraper returns null
      // but the create endpoint requires a non-null integer.
      const payload = {
        ...result.recipe,
        steps: result.recipe.steps?.map(step => ({
          ...step,
          ingredients: step.ingredients?.map((ing, idx) => ({
            ...ing,
            order: ing.order ?? idx,
          })) ?? [],
        })) ?? [],
      };

      if (opts.dryRun) {
        const format = resolveFormat(opts);
        emitOutput(format, {
          text: () => {
            console.log('\nScraped recipe (not saved):');
            console.log(`  Name:         ${payload.name}`);
            console.log(`  Description:  ${payload.description ?? '—'}`);
            console.log(`  Servings:     ${payload.servings ?? '—'}`);
            console.log(`  Working time: ${payload.working_time ?? '—'} min`);
            console.log(`  Waiting time: ${payload.waiting_time ?? '—'} min`);
            console.log(`  Steps:        ${payload.steps?.length ?? 0}`);
          },
          json: () => payload,
          api: () => payload,
        });
        return;
      }

      const created = await createRecipe(payload);

      if (result.images.length > 0) {
        try {
          await setRecipeImageFromUrl(created.id, result.images[0]);
        } catch {
          process.stderr.write(`Warning: recipe saved but image could not be attached.\n`);
        }
      }

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => printSuccess(`Imported recipe #${created.id}: ${created.name}`),
        json: () => recipeToCreatePayload(created),
        api: () => created,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
