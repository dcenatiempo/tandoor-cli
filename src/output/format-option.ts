import { Command } from 'commander';
import { printJson, printError } from './formatter';

export type OutputFormat = 'text' | 'json' | 'api';

const FORMAT_VALUES: OutputFormat[] = ['text', 'json', 'api'];

export function warnDeprecated(flag: string, replacement: string): void {
  process.stderr.write(`Warning: ${flag} is deprecated; use ${replacement} instead.\n`);
}

export function addFormatOption(cmd: Command): Command {
  return cmd
    .option(
      '--format <type>',
      'Output format: text (default), json (slim), or api (raw API response)',
      'text',
    )
    .option('--json', 'Deprecated: use --format api');
}

export function resolveFormat(opts: { format?: string; json?: boolean }): OutputFormat {
  const formatArg = opts.format ?? 'text';

  if (!FORMAT_VALUES.includes(formatArg as OutputFormat)) {
    printError(`Invalid --format "${formatArg}". Expected one of: ${FORMAT_VALUES.join(', ')}.`);
    process.exit(1);
  }

  const format = formatArg as OutputFormat;

  if (opts.json) {
    if (format !== 'text' && format !== 'api') {
      printError('Cannot use --json with --format json. Use --format api for raw API output.');
      process.exit(1);
    }
    warnDeprecated('--json', '--format api');
    return 'api';
  }

  return format;
}

export function emitOutput(
  format: OutputFormat,
  handlers: { text: () => void; json: () => unknown; api: () => unknown },
): void {
  switch (format) {
    case 'text':
      handlers.text();
      break;
    case 'json':
      printJson(handlers.json());
      break;
    case 'api':
      printJson(handlers.api());
      break;
  }
}

export function resolveInputFile(opts: {
  file?: string;
  json?: string;
}): string | undefined {
  if (opts.file && opts.json && opts.file !== opts.json) {
    printError('Cannot use both --file and --json with different paths.');
    process.exit(1);
  }

  if (opts.json && !opts.file) {
    warnDeprecated('--json <path>', '--file <path>');
  }

  return opts.file ?? opts.json;
}
