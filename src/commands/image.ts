import { Command } from 'commander';
import { uploadRecipeImage } from '../api/recipes';
import { printSuccess, printError } from '../output/formatter';
import * as fs from 'fs';
import * as path from 'path';

export function registerImageCommand(program: Command): void {
  program
    .command('image <recipeId> <imagePath>')
    .description('Upload an image to a recipe')
    .action(async (recipeId: string, imagePath: string) => {
      try {
        // Validate recipe ID
        const id = parseInt(recipeId, 10);
        if (isNaN(id) || id <= 0) {
          printError('Invalid recipe ID. Must be a positive integer.');
          process.exit(1);
        }

        // Validate image path exists
        if (!fs.existsSync(imagePath)) {
          printError(`Image file not found: ${imagePath}`);
          process.exit(1);
        }

        // Validate file is readable
        try {
          fs.accessSync(imagePath, fs.constants.R_OK);
        } catch {
          printError(`Cannot read image file: ${imagePath}`);
          process.exit(1);
        }

        // Validate file extension (JPEG, PNG)
        const ext = path.extname(imagePath).toLowerCase();
        const validExtensions = ['.jpg', '.jpeg', '.png'];
        if (!validExtensions.includes(ext)) {
          printError(
            `Unsupported image format: ${ext}. Supported formats: ${validExtensions.join(', ')}`
          );
          process.exit(1);
        }

        // Upload the image
        const result = await uploadRecipeImage(id, imagePath);
        printSuccess(`Image uploaded successfully: ${result.image}`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
