import { Command } from 'commander';
import { listCookLogs, createCookLog, updateCookLog, deleteCookLog, findCookLogsByIngredient } from '../api/cooklog';
import { printJson, printSuccess, printError } from '../output/formatter';
import { isValidDate } from '../utils';

export function registerCooklogCommand(program: Command): void {
  const cooklog = program
    .command('cooklog')
    .description('Manage cook logs (track when you cook recipes)');

  // cooklog list
  cooklog
    .command('list')
    .description('List cook log entries (sorted by most recent first)')
    .option('--recipe <id>', 'Filter by recipe ID')
    .option('--limit <number>', 'Maximum number of entries to return', '20')
    .option('--startdate <YYYY-MM-DD>', 'Filter entries from this date (inclusive)')
    .option('--enddate <YYYY-MM-DD>', 'Filter entries up to this date (inclusive)')
    .option('--min-rating <1-5>', 'Minimum rating (inclusive)')
    .option('--max-rating <1-5>', 'Maximum rating (inclusive)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        if (opts.startdate && !isValidDate(opts.startdate)) {
          printError(`Invalid --startdate format "${opts.startdate}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }
        if (opts.enddate && !isValidDate(opts.enddate)) {
          printError(`Invalid --enddate format "${opts.enddate}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }

        const minRating = opts.minRating ? parseInt(opts.minRating, 10) : undefined;
        const maxRating = opts.maxRating ? parseInt(opts.maxRating, 10) : undefined;

        if (minRating !== undefined && (minRating < 1 || minRating > 5)) {
          printError('--min-rating must be between 1 and 5.');
          process.exit(1);
        }
        if (maxRating !== undefined && (maxRating < 1 || maxRating > 5)) {
          printError('--max-rating must be between 1 and 5.');
          process.exit(1);
        }
        if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
          printError('--min-rating cannot be greater than --max-rating.');
          process.exit(1);
        }

        const entries = await listCookLogs({
          recipe: opts.recipe ? parseInt(opts.recipe, 10) : undefined,
          limit: parseInt(opts.limit, 10),
          startdate: opts.startdate,
          enddate: opts.enddate,
          minRating,
          maxRating,
        });

        if (opts.json) {
          printJson(entries);
        } else if (entries.length === 0) {
          console.log('No cook log entries found.');
        } else {
          entries.forEach((entry) => {
            const date = new Date(entry.created_at).toLocaleDateString();
            const rating = entry.rating !== null ? `★${entry.rating}` : 'no rating';
            console.log(
              `#${entry.id} - Recipe ${entry.recipe} - ${entry.servings} servings - ${rating} - ${date}`,
            );
          });
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // cooklog ingredient
  cooklog
    .command('ingredient <name>')
    .description('Find cook logs by ingredient name')
    .option('--limit <number>', 'Maximum number of entries to search', '100')
    .option('--startdate <YYYY-MM-DD>', 'Filter entries from this date (inclusive)')
    .option('--enddate <YYYY-MM-DD>', 'Filter entries up to this date (inclusive)')
    .option('--min-rating <1-5>', 'Minimum rating (inclusive)')
    .option('--max-rating <1-5>', 'Maximum rating (inclusive)')
    .option('--json', 'Output as JSON')
    .action(async (name: string, opts) => {
      try {
        if (opts.startdate && !isValidDate(opts.startdate)) {
          printError(`Invalid --startdate format "${opts.startdate}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }
        if (opts.enddate && !isValidDate(opts.enddate)) {
          printError(`Invalid --enddate format "${opts.enddate}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }

        const minRating = opts.minRating ? parseInt(opts.minRating, 10) : undefined;
        const maxRating = opts.maxRating ? parseInt(opts.maxRating, 10) : undefined;

        if (minRating !== undefined && (minRating < 1 || minRating > 5)) {
          printError('--min-rating must be between 1 and 5.');
          process.exit(1);
        }
        if (maxRating !== undefined && (maxRating < 1 || maxRating > 5)) {
          printError('--max-rating must be between 1 and 5.');
          process.exit(1);
        }
        if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
          printError('--min-rating cannot be greater than --max-rating.');
          process.exit(1);
        }

        const entries = await findCookLogsByIngredient(name, {
          limit: parseInt(opts.limit, 10),
          startdate: opts.startdate,
          enddate: opts.enddate,
          minRating,
          maxRating,
        });

        if (opts.json) {
          printJson(entries);
        } else if (entries.length === 0) {
          console.log(`No cook log entries found containing ingredient "${name}".`);
        } else {
          console.log(`Found ${entries.length} cook log(s) containing "${name}":\n`);
          
          // Show the most recent one first
          const mostRecent = entries[0];
          const mostRecentDate = new Date(mostRecent.created_at);
          console.log(`Most recent: ${mostRecentDate.toLocaleDateString()} (${mostRecent.recipe_name})`);
          
          // Show count summary if there's a date range or rating filter
          const filters: string[] = [];
          if (opts.startdate || opts.enddate) {
            const start = opts.startdate ? new Date(opts.startdate).toLocaleDateString() : 'beginning';
            const end = opts.enddate ? new Date(opts.enddate).toLocaleDateString() : 'now';
            filters.push(`${start} to ${end}`);
          }
          if (minRating !== undefined && maxRating !== undefined) {
            if (minRating === maxRating) {
              filters.push(`★${minRating}`);
            } else {
              filters.push(`★${minRating}-${maxRating}`);
            }
          } else if (minRating !== undefined) {
            filters.push(`★${minRating}+`);
          } else if (maxRating !== undefined) {
            filters.push(`★${maxRating} or less`);
          }
          
          if (filters.length > 0) {
            console.log(`Count (${filters.join(', ')}): ${entries.length}\n`);
          } else {
            console.log('');
          }
          
          // List all entries
          entries.forEach((entry) => {
            const date = new Date(entry.created_at).toLocaleDateString();
            const rating = entry.rating !== null ? `★${entry.rating}` : 'no rating';
            console.log(
              `  #${entry.id} - ${entry.recipe_name} - ${entry.servings} servings - ${rating} - ${date}`,
            );
          });
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // cooklog add
  cooklog
    .command('add')
    .description('Add a cook log entry')
    .requiredOption('--recipe <id>', 'Recipe ID')
    .requiredOption('--servings <number>', 'Number of servings')
    .option('--rating <1-5>', 'Rating from 1 to 5')
    .option('--date <ISO8601>', 'Date/time in ISO 8601 format (e.g., 2026-04-27T04:00:00.000Z)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const recipeId = parseInt(opts.recipe, 10);
        const servings = parseInt(opts.servings, 10);
        const rating = opts.rating ? parseInt(opts.rating, 10) : undefined;

        if (rating !== undefined && (rating < 1 || rating > 5)) {
          printError('Rating must be between 1 and 5.');
          process.exit(1);
        }

        const entry = await createCookLog(recipeId, servings, rating, opts.date);

        if (opts.json) {
          printJson(entry);
        } else {
          printSuccess(`Added cook log entry #${entry.id}.`);
          const date = new Date(entry.created_at).toLocaleDateString();
          const ratingStr = entry.rating !== null ? `★${entry.rating}` : 'no rating';
          console.log(
            `Recipe ${entry.recipe} - ${entry.servings} servings - ${ratingStr} - ${date}`,
          );
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // cooklog update
  cooklog
    .command('update <id>')
    .description('Update a cook log entry')
    .requiredOption('--recipe <id>', 'Recipe ID')
    .requiredOption('--servings <number>', 'Number of servings')
    .option('--rating <1-5>', 'Rating from 1 to 5')
    .option('--date <ISO8601>', 'Date/time in ISO 8601 format (e.g., 2026-04-27T04:00:00.000Z)')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts) => {
      try {
        const cooklogId = parseInt(id, 10);
        const recipeId = parseInt(opts.recipe, 10);
        const servings = parseInt(opts.servings, 10);
        const rating = opts.rating ? parseInt(opts.rating, 10) : undefined;

        if (rating !== undefined && (rating < 1 || rating > 5)) {
          printError('Rating must be between 1 and 5.');
          process.exit(1);
        }

        const entry = await updateCookLog(cooklogId, recipeId, servings, rating, opts.date);

        if (opts.json) {
          printJson(entry);
        } else {
          printSuccess(`Updated cook log entry #${entry.id}.`);
          const date = new Date(entry.created_at).toLocaleDateString();
          const ratingStr = entry.rating !== null ? `★${entry.rating}` : 'no rating';
          console.log(
            `Recipe ${entry.recipe} - ${entry.servings} servings - ${ratingStr} - ${date}`,
          );
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // cooklog delete
  cooklog
    .command('delete <id>')
    .description('Delete a cook log entry by ID')
    .action(async (id: string) => {
      try {
        await deleteCookLog(parseInt(id, 10));
        printSuccess(`Deleted cook log entry #${id}.`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
