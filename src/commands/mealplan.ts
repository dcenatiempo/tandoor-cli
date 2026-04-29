import { Command } from 'commander';
import { listMealPlans, createMealPlan, deleteMealPlan } from '../api/mealplan';
import { formatMealPlan, printJson, printSuccess, printError } from '../output/formatter';
import { isValidDate } from '../utils';

export function registerMealplanCommand(program: Command): void {
  const mealplan = program
    .command('mealplan')
    .description('Manage meal plans');

  // mealplan list
  mealplan
    .command('list')
    .description('List all meal plan entries')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const entries = await listMealPlans();
        if (opts.json) {
          printJson(entries);
        } else if (entries.length === 0) {
          console.log('No meal plan entries found.');
        } else {
          entries.forEach(formatMealPlan);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // mealplan add
  mealplan
    .command('add')
    .description('Add a meal plan entry')
    .requiredOption('--recipe <id>', 'Recipe ID')
    .requiredOption('--date <YYYY-MM-DD>', 'Date in YYYY-MM-DD format')
    .requiredOption('--meal-type <id>', 'Meal type ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        if (!isValidDate(opts.date)) {
          printError(`Invalid date format "${opts.date}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }

        const entry = await createMealPlan(
          parseInt(opts.recipe, 10),
          opts.date,
          parseInt(opts.mealType, 10),
        );

        if (opts.json) {
          printJson(entry);
        } else {
          printSuccess(`Added meal plan entry #${entry.id}.`);
          formatMealPlan(entry);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // mealplan delete
  mealplan
    .command('delete <id>')
    .description('Delete a meal plan entry by ID')
    .action(async (id: string) => {
      try {
        await deleteMealPlan(parseInt(id, 10));
        printSuccess(`Deleted meal plan entry #${id}.`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
