import { Command } from 'commander';
import * as fs from 'fs';
import * as readline from 'readline';
import { createRecipe } from '../api/recipes';
import { printJson, printSuccess, printError } from '../output/formatter';
import { isValidName, parseIngredientLine } from '../utils';
import { RecipeCreatePayload, StepCreatePayload, IngredientCreatePayload } from '../api/types';

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function collectInteractive(): Promise<RecipeCreatePayload> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Name is required — re-prompt until non-empty
    let name = '';
    while (!isValidName(name)) {
      name = await prompt(rl, 'Recipe name (required): ');
      if (!isValidName(name)) {
        console.log('Name cannot be empty. Please try again.');
      }
    }

    const description = await prompt(rl, 'Description (optional): ');
    const servingsStr = await prompt(rl, 'Servings (optional): ');
    const workingStr  = await prompt(rl, 'Working time in minutes (optional): ');
    const waitingStr  = await prompt(rl, 'Waiting time in minutes (optional): ');

    const servings     = servingsStr.trim()  ? parseInt(servingsStr, 10)  : undefined;
    const working_time = workingStr.trim()   ? parseInt(workingStr, 10)   : undefined;
    const waiting_time = waitingStr.trim()   ? parseInt(waitingStr, 10)   : undefined;

    const steps: StepCreatePayload[] = [];
    let addStep = true;
    let stepOrder = 0;

    while (addStep) {
      console.log(`\nStep ${stepOrder + 1}`);
      const instruction = await prompt(rl, '  Instruction: ');

      const ingredients: IngredientCreatePayload[] = [];
      console.log('  Ingredients (format: "amount unit food", empty line to finish):');
      while (true) {
        const line = await prompt(rl, '    > ');
        if (!line.trim()) break;
        ingredients.push(parseIngredientLine(line));
      }

      steps.push({ instruction, order: stepOrder, ingredients });
      stepOrder++;

      const another = await prompt(rl, 'Add another step? (y/N): ');
      addStep = another.trim().toLowerCase() === 'y';
    }

    const payload: RecipeCreatePayload = {
      name: name.trim(),
      steps,
    };
    if (description.trim()) payload.description = description.trim();
    if (servings !== undefined && !isNaN(servings)) payload.servings = servings;
    if (working_time !== undefined && !isNaN(working_time)) payload.working_time = working_time;
    if (waiting_time !== undefined && !isNaN(waiting_time)) payload.waiting_time = waiting_time;

    return payload;
  } finally {
    rl.close();
  }
}

export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description('Create a new recipe from a JSON file (use --interactive for prompted input)')
    .option('--json <file>', 'Read recipe payload from a JSON file')
    .option('--interactive', 'Enable interactive prompts to build the recipe')
    .action(async (opts) => {
      try {
        let payload: RecipeCreatePayload;

        if (opts.json) {
          const raw = fs.readFileSync(opts.json, 'utf-8');
          payload = JSON.parse(raw) as RecipeCreatePayload;
        } else if (opts.interactive) {
          payload = await collectInteractive();
        } else {
          printError('No input provided. Use --json <file> to supply a recipe payload, or --interactive for prompted input.');
          process.exit(1);
        }

        const recipe = await createRecipe(payload);
        printSuccess(`Created recipe #${recipe.id}: ${recipe.name}`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
