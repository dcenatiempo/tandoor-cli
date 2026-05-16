import { Command } from 'commander';
import {
  listCookLogs,
  enrichCookLogsWithRecipeNames,
  createCookLog,
  updateCookLog,
  deleteCookLog,
  findCookLogsByIngredient,
} from '../api/cooklog';
import { cookLogsToListPayload } from '../api/cooklog-payload';
import { formatCookLogList, printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
import { isValidDate } from '../utils';

export function registerCooklogCommand(program: Command): void {
  const cooklog = program
    .command('cooklog')
    .description('Manage cook logs (track when you cook recipes)');

  addFormatOption(
    cooklog
      .command('list')
      .description('List cook log entries (sorted by most recent first)')
      .option('--recipe <id>', 'Filter by recipe ID')
      .option('--limit <number>', 'Results per page', '20')
      .option('--page <number>', 'Page number when using --limit (default 1)', '1')
      .option('--all', 'Return every matching entry (ignores --limit and --page)')
      .option('--startdate <YYYY-MM-DD>', 'Filter entries from this date (inclusive)')
      .option('--enddate <YYYY-MM-DD>', 'Filter entries up to this date (inclusive)')
      .option('--min-rating <1-5>', 'Minimum rating (inclusive)')
      .option('--max-rating <1-5>', 'Maximum rating (inclusive)'),
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

      if (opts.all) {
        const page = parseInt(opts.page, 10);
        if (!isNaN(page) && page > 1) {
          printError('--all cannot be used with --page greater than 1.');
          process.exit(1);
        }
      }

      let limit: number | undefined;
      if (!opts.all) {
        limit = parseInt(opts.limit, 10);
        if (isNaN(limit) || limit < 1) {
          printError('--limit must be a positive integer.');
          process.exit(1);
        }
      }

      let page: number | undefined;
      if (!opts.all) {
        page = parseInt(opts.page, 10);
        if (isNaN(page) || page < 1) {
          printError('--page must be a positive integer.');
          process.exit(1);
        }
      }

      const entries = await listCookLogs({
        fetchAll: Boolean(opts.all),
        recipe: opts.recipe ? parseInt(opts.recipe, 10) : undefined,
        limit,
        page,
        startdate: opts.startdate,
        enddate: opts.enddate,
        minRating,
        maxRating,
      });

      const format = resolveFormat(opts);
      const enriched = await enrichCookLogsWithRecipeNames(entries);

      emitOutput(format, {
        text: () => formatCookLogList(enriched),
        json: () => cookLogsToListPayload(enriched),
        api: () => entries,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    cooklog
      .command('ingredient <name>')
      .description('Find cook logs by ingredient name')
      .option('--limit <number>', 'Maximum number of entries to search', '100')
      .option('--startdate <YYYY-MM-DD>', 'Filter entries from this date (inclusive)')
      .option('--enddate <YYYY-MM-DD>', 'Filter entries up to this date (inclusive)')
      .option('--min-rating <1-5>', 'Minimum rating (inclusive)')
      .option('--max-rating <1-5>', 'Maximum rating (inclusive)'),
  ).action(async (name: string, opts) => {
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

      const format = resolveFormat(opts);
      if (format === 'text' && entries.length === 0) {
        console.log(`No cook log entries found containing ingredient "${name}".`);
        return;
      }

      emitOutput(format, {
        text: () => {
          console.log(`Found ${entries.length} cook log(s) containing "${name}":\n`);

          const mostRecent = entries[0];
          const mostRecentDate = new Date(mostRecent.created_at);
          console.log(
            `Most recent: ${mostRecentDate.toLocaleDateString()} (${mostRecent.recipe_name})`,
          );

          const filters: string[] = [];
          if (opts.startdate || opts.enddate) {
            const start = opts.startdate
              ? new Date(opts.startdate).toLocaleDateString()
              : 'beginning';
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

          formatCookLogList(entries, { prefix: '  ' });
        },
        json: () => entries,
        api: () => entries,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    cooklog
      .command('add')
      .description('Add a cook log entry')
      .requiredOption('--recipe <id>', 'Recipe ID')
      .requiredOption('--servings <number>', 'Number of servings')
      .option('--rating <1-5>', 'Rating from 1 to 5')
      .option('--date <ISO8601>', 'Date/time in ISO 8601 format (e.g., 2026-04-27T04:00:00.000Z)'),
  ).action(async (opts) => {
    try {
      const recipeId = parseInt(opts.recipe, 10);
      const servings = parseInt(opts.servings, 10);
      const rating = opts.rating ? parseInt(opts.rating, 10) : undefined;

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        printError('Rating must be between 1 and 5.');
        process.exit(1);
      }

      const entry = await createCookLog(recipeId, servings, rating, opts.date);

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          printSuccess(`Added cook log entry #${entry.id}.`);
          const date = new Date(entry.created_at).toLocaleDateString();
          const ratingStr = entry.rating !== null ? `★${entry.rating}` : 'no rating';
          console.log(
            `Recipe ${entry.recipe} - ${entry.servings} servings - ${ratingStr} - ${date}`,
          );
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
    cooklog
      .command('update <id>')
      .description('Update a cook log entry (at least one field required)')
      .option('--recipe <id>', 'Recipe ID')
      .option('--servings <number>', 'Number of servings')
      .option('--rating <1-5>', 'Rating from 1 to 5')
      .option('--date <ISO8601>', 'Date/time in ISO 8601 format (e.g., 2026-04-27T04:00:00.000Z)'),
  ).action(async (id: string, opts) => {
    try {
      const cooklogId = parseInt(id, 10);
      if (isNaN(cooklogId)) {
        printError('Cook log ID must be a number.');
        process.exit(1);
      }

      const hasUpdate =
        opts.recipe !== undefined ||
        opts.servings !== undefined ||
        opts.rating !== undefined ||
        opts.date !== undefined;

      if (!hasUpdate) {
        printError('At least one of --recipe, --servings, --rating, or --date is required.');
        process.exit(1);
      }

      const patch: {
        recipe?: number;
        servings?: number;
        rating?: number;
        createdAt?: string;
      } = {};

      if (opts.recipe !== undefined) {
        const recipeId = parseInt(opts.recipe, 10);
        if (isNaN(recipeId)) {
          printError('--recipe must be a number.');
          process.exit(1);
        }
        patch.recipe = recipeId;
      }

      if (opts.servings !== undefined) {
        const servings = parseInt(opts.servings, 10);
        if (isNaN(servings) || servings < 1) {
          printError('--servings must be a positive integer.');
          process.exit(1);
        }
        patch.servings = servings;
      }

      if (opts.rating !== undefined) {
        const rating = parseInt(opts.rating, 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          printError('Rating must be between 1 and 5.');
          process.exit(1);
        }
        patch.rating = rating;
      }

      if (opts.date !== undefined) {
        patch.createdAt = opts.date;
      }

      const entry = await updateCookLog(cooklogId, patch);

      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          printSuccess(`Updated cook log entry #${entry.id}.`);
          const date = new Date(entry.created_at).toLocaleDateString();
          const ratingStr = entry.rating !== null ? `★${entry.rating}` : 'no rating';
          console.log(
            `Recipe ${entry.recipe} - ${entry.servings} servings - ${ratingStr} - ${date}`,
          );
        },
        json: () => entry,
        api: () => entry,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

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
