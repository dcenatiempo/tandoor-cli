#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { registerListCommand } from './commands/list';
import { registerSearchCommand } from './commands/search';
import { registerGetCommand } from './commands/get';
import { registerRandomCommand } from './commands/random';
import { registerAddCommand } from './commands/add';
import { registerUpdateCommand } from './commands/update';
import { registerDeleteCommand } from './commands/delete';
import { registerMealplanCommand } from './commands/mealplan';
import { registerShoppingCommand } from './commands/shopping';
import { registerImportCommand } from './commands/import';
import { registerConfigureCommand } from './commands/configure';
import { registerFoodCommand } from './commands/food';
import { registerHouseholdCommand } from './commands/household';
import { registerImageCommand } from './commands/image';
import { registerCooklogCommand } from './commands/cooklog';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('tandoor')
  .description('CLI for the Tandoor Recipe Manager')
  .version(pkg.version)
  .showHelpAfterError();

registerListCommand(program);
registerSearchCommand(program);
registerGetCommand(program);
registerRandomCommand(program);
registerAddCommand(program);
registerUpdateCommand(program);
registerDeleteCommand(program);
registerMealplanCommand(program);
registerShoppingCommand(program);
registerImportCommand(program);
registerConfigureCommand(program);
registerFoodCommand(program);
registerHouseholdCommand(program);
registerImageCommand(program);
registerCooklogCommand(program);

process.on('unhandledRejection', (err) => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + '\n');
  process.exit(1);
});

program.parseAsync(process.argv);
