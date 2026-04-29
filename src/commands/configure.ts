import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { readConfigFile } from '../config';

function getConfigFilePath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  return path.join(base, 'tandoor-cli', 'config.json');
}

export function writeConfigFile(filePath: string, data: { url: string; token: string }): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export type RlFactory = (opts: readline.ReadLineOptions) => readline.Interface;

export function registerConfigureCommand(
  program: Command,
  configFilePath?: string,
  rlFactory?: RlFactory,
): void {
  program
    .command('configure')
    .description('Configure Tandoor CLI credentials')
    .action(async () => {
      const filePath = configFilePath ?? getConfigFilePath();
      const existing = readConfigFile(filePath);

      const createRl = rlFactory ?? readline.createInterface;
      const rl = createRl({ input: process.stdin, output: process.stdout });
      try {
        const urlDefault = existing?.url ? ` [${existing.url}]` : '';
        const urlInput = await prompt(rl, `Tandoor URL${urlDefault}: `);
        const url = urlInput.trim() || existing?.url || '';

        const tokenDefault = existing?.token ? ' [existing token]' : '';
        const tokenInput = await prompt(rl, `API Token${tokenDefault}: `);
        const token = tokenInput.trim() || existing?.token || '';

        if (!url || !token) {
          process.stderr.write('Error: URL and API token are required.\n');
          process.exit(1);
        }

        try {
          writeConfigFile(filePath, { url, token });
          process.stdout.write(`Configuration saved to ${filePath}\n`);
        } catch (err: unknown) {
          process.stderr.write(`Error: Failed to write config file: ${(err as Error).message}\n`);
          process.exit(1);
        }
      } finally {
        rl.close();
      }
    });
}
