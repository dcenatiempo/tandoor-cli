import { Command } from 'commander';
import { listMealPlans, createMealPlan, deleteMealPlan, resolveMealType } from '../api/mealplan';
import { mealPlansToListPayload } from '../api/mealplan-payload';
import { addMealPlanIngredientsToShopping } from '../api/shopping';
import { formatMealPlan, printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
import { isValidDate } from '../utils';

export function registerMealplanCommand(program: Command): void {
  const mealplan = program
    .command('mealplan')
    .description('Manage meal plans');

  addFormatOption(
    mealplan
      .command('list')
      .description('List all meal plan entries')
      .option('--startdate <YYYY-MM-DD>', 'Filter entries from this date (inclusive)')
      .option('--enddate <YYYY-MM-DD>', 'Filter entries up to this date (inclusive)'),
  ).action(async (opts) => {
    try {
      if (opts.startdate && !isValidDate(opts.startdate)) {
        printError(`Invalid --startdate format "${opts.startdate}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }
      if (opts.enddate && !isValidDate(opts.enddate)) {
        printError(`Invalid --enddate format "${opts.enddate}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }

      const entries = await listMealPlans({
        startdate: opts.startdate,
        enddate: opts.enddate,
      });

      const format = resolveFormat(opts);
      if (format === 'text' && entries.length === 0) {
        console.log('No meal plan entries found.');
        return;
      }

      const jsonPayload = format === 'json' ? await mealPlansToListPayload(entries) : null;

      emitOutput(format, {
        text: () => entries.forEach(formatMealPlan),
        json: () => jsonPayload!,
        api: () => entries,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    mealplan
      .command('add')
      .description('Add a meal plan entry')
      .option('--recipe <id>', 'Recipe ID (required)')
      .option('--date <YYYY-MM-DD>', 'Date in YYYY-MM-DD format (required)')
      .option('--meal-type <name|id>', 'Meal type name (e.g., "breakfast", "lunch", "dinner") or ID (required)')
      .option('--servings <number>', 'Number of servings (required)'),
  ).action(async (opts) => {
    try {
      if (!opts.recipe || !opts.date || !opts.mealType || !opts.servings) {
        printError('--recipe, --date, --meal-type, and --servings are all required.');
        process.exit(1);
      }
      if (!isValidDate(opts.date)) {
        printError(`Invalid date format "${opts.date}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }

      const mealTypeId = await resolveMealType(opts.mealType);

      const entry = await createMealPlan(
        parseInt(opts.recipe, 10),
        opts.date,
        mealTypeId,
        parseInt(opts.servings, 10),
      );

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          printSuccess(`Added meal plan entry #${entry.id}.`);
          formatMealPlan(entry);
        },
        json: () => entry,
        api: () => entry,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    mealplan
      .command('make-shopping-list')
      .description('Add all ingredients from meal plan entries in a date range to the shopping list')
      .option('--startdate <YYYY-MM-DD>', 'Start date for meal plan range (required)')
      .option('--enddate <YYYY-MM-DD>', 'End date for meal plan range (required)'),
  ).action(async (opts) => {
    try {
      if (!opts.startdate || !opts.enddate) {
        printError('--startdate and --enddate are required.');
        process.exit(1);
      }
      if (!isValidDate(opts.startdate)) {
        printError(`Invalid --startdate format "${opts.startdate}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }
      if (!isValidDate(opts.enddate)) {
        printError(`Invalid --enddate format "${opts.enddate}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }

      const { added, skipped } = await addMealPlanIngredientsToShopping(opts.startdate, opts.enddate);
      const result = { added: added.map((a) => a.entry), skipped };

      const format = resolveFormat(opts);
      if (format === 'text' && added.length === 0 && skipped.length === 0) {
        console.log('No meal plan entries found in the given date range.');
        return;
      }

      emitOutput(format, {
        text: () => {
          if (added.length > 0) {
            printSuccess(`Added ${added.length} ingredient(s) to the shopping list.`);
            added.forEach((a) => {
              const parts = [a.amount !== 0 ? String(a.amount) : '', a.unit, a.food]
                .filter(Boolean)
                .join(' ');
              console.log(`  • ${parts}`);
            });
          } else {
            console.log('No ingredients added (all were skipped).');
          }
          if (skipped.length > 0) {
            console.log(`\nSkipped ${skipped.length} ingredient(s):`);
            skipped.forEach((s) => {
              const reason = s.reason === 'food_onhand' ? 'on hand' : 'ignore shopping';
              console.log(`  ⊘ ${s.food}  (${reason})`);
            });
          }
        },
        json: () => result,
        api: () => result,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

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
