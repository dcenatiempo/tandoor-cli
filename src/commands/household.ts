import { Command } from 'commander';
import {
  listHouseholds,
  listHouseholdsFromUserSpace,
  getHousehold,
  createHousehold,
  updateHousehold,
  deleteHousehold,
  listUsers,
  listUserSpaces,
  assignUserToHousehold,
  listInviteLinks,
  createInviteLink,
  deleteInviteLink,
} from '../api/household';
import { printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';
import { Household, InviteLink, TandoorUser, UserSpace } from '../api/types';

function formatHousehold(h: Household): void {
  const updated = new Date(h.updated_at).toLocaleDateString();
  console.log(`[${h.id}] ${h.name}  (updated ${updated})`);
}

function formatUser(u: TandoorUser): void {
  const flags: string[] = [];
  if (u.is_staff) flags.push('staff');
  if (u.is_superuser) flags.push('superuser');
  if (!u.is_active) flags.push('inactive');
  const suffix = flags.length ? `  (${flags.join(', ')})` : '';
  console.log(`[${u.id}] ${u.display_name}${suffix}`);
}

function formatUserSpace(us: UserSpace): void {
  const household = us.household ? us.household.name : '(none)';
  const groups = us.groups.map((g) => g.name).join(', ') || '(none)';
  console.log(`[${us.id}] ${us.user.display_name}  household: ${household}  groups: ${groups}`);
}

function formatInviteLink(link: InviteLink, baseUrl: string): void {
  const url = `${baseUrl}/invite/${link.uuid}/`;
  const expiry = link.valid_until
    ? new Date(link.valid_until).toLocaleDateString()
    : 'never';
  const usedBy = link.used_by ? `  used by: ${link.used_by.display_name}` : '';
  console.log(`[${link.id}] ${url}  expires: ${expiry}${usedBy}`);
}

export function registerHouseholdCommand(program: Command): void {
  const household = program
    .command('household')
    .description('Manage households, users, and invite links');

  addFormatOption(
    household.command('list').description('List all households'),
  ).action(async (opts) => {
    try {
      let households: Household[];
      try {
        households = await listHouseholds();
      } catch (err) {
        if (err instanceof Error && err.message.includes('403')) {
          households = await listHouseholdsFromUserSpace();
        } else {
          throw err;
        }
      }

      const format = resolveFormat(opts);
      if (format === 'text' && households.length === 0) {
        console.log('No households found.');
        return;
      }

      emitOutput(format, {
        text: () => households.forEach(formatHousehold),
        json: () => households,
        api: () => households,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    household.command('get <id>').description('Get details of a household by ID'),
  ).action(async (id: string, opts) => {
    try {
      const h = await getHousehold(parseInt(id, 10));
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => formatHousehold(h),
        json: () => h,
        api: () => h,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    household.command('add <name>').description('Create a new household'),
  ).action(async (name: string, opts) => {
    try {
      const h = await createHousehold(name);
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => printSuccess(`Created household "${h.name}" (ID: ${h.id}).`),
        json: () => h,
        api: () => h,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    household
      .command('edit <id>')
      .description('Rename a household')
      .requiredOption('--name <name>', 'New name for the household'),
  ).action(async (id: string, opts) => {
    try {
      const h = await updateHousehold(parseInt(id, 10), opts.name);
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => printSuccess(`Household #${h.id} renamed to "${h.name}".`),
        json: () => h,
        api: () => h,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  household
    .command('delete <id>')
    .description('Delete a household by ID')
    .option('--force', 'Skip confirmation prompt')
    .action(async (id: string, opts) => {
      try {
        if (!opts.force) {
          printError(
            `This will permanently delete household #${id}. Re-run with --force to confirm.`,
          );
          process.exit(1);
        }
        await deleteHousehold(parseInt(id, 10));
        printSuccess(`Deleted household #${id}.`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  const users = household
    .command('users')
    .description('Manage users and household membership');

  addFormatOption(
    users.command('list').description('List all users in the space'),
  ).action(async (opts) => {
    try {
      const userList = await listUsers();
      const format = resolveFormat(opts);
      if (format === 'text' && userList.length === 0) {
        console.log('No users found.');
        return;
      }
      emitOutput(format, {
        text: () => userList.forEach(formatUser),
        json: () => userList,
        api: () => userList,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    users
      .command('memberships')
      .description('List all user-space memberships (shows which household each user belongs to)'),
  ).action(async (opts) => {
    try {
      const memberships = await listUserSpaces();
      const format = resolveFormat(opts);
      if (format === 'text' && memberships.length === 0) {
        console.log('No memberships found.');
        return;
      }
      emitOutput(format, {
        text: () => memberships.forEach(formatUserSpace),
        json: () => memberships,
        api: () => memberships,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    users
      .command('assign <user-space-id> <household-id>')
      .description('Assign a user (by their user-space ID) to a different household'),
  ).action(async (userSpaceId: string, householdId: string, opts) => {
    try {
      const updated = await assignUserToHousehold(
        parseInt(userSpaceId, 10),
        parseInt(householdId, 10),
      );
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          const householdName = updated.household?.name ?? `#${householdId}`;
          printSuccess(
            `User "${updated.user.display_name}" assigned to household "${householdName}".`,
          );
        },
        json: () => updated,
        api: () => updated,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  const invite = household
    .command('invite')
    .description('Manage invite links (the way to add new users to a household)');

  addFormatOption(
    invite.command('list').description('List all invite links'),
  ).action(async (opts) => {
    try {
      const links = await listInviteLinks();
      const format = resolveFormat(opts);
      if (format === 'text' && links.length === 0) {
        console.log('No invite links found.');
        return;
      }
      const baseUrl = process.env.TANDOOR_URL ?? 'http://localhost:8050';
      emitOutput(format, {
        text: () => links.forEach((l) => formatInviteLink(l, baseUrl)),
        json: () => links,
        api: () => links,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  addFormatOption(
    invite
      .command('create <household-id>')
      .description('Create an invite link for a household (requires admin privileges)')
      .option('--email <email>', 'Pre-fill the invitee email address')
      .option('--expires <YYYY-MM-DD>', 'Set an expiry date for the link')
      .option('--group-id <id>', 'Group ID to assign the new user to (default: 2 for "user" group)'),
  ).action(async (householdId: string, opts) => {
    try {
      const link = await createInviteLink(parseInt(householdId, 10), {
        email: opts.email,
        expiryDate: opts.expires,
        groupId: opts.groupId ? parseInt(opts.groupId, 10) : undefined,
      });
      const format = resolveFormat(opts);
      emitOutput(format, {
        text: () => {
          const baseUrl = process.env.TANDOOR_URL ?? 'http://localhost:8050';
          const url = `${baseUrl}/invite/${link.uuid}/`;
          printSuccess(`Invite link created for household #${householdId}:`);
          console.log(`  ${url}`);
          const groupName = typeof link.group === 'object' ? link.group.name : link.group;
          console.log(`  Group: ${groupName}`);
          if (link.valid_until) {
            console.log(`  Expires: ${new Date(link.valid_until).toLocaleDateString()}`);
          }
        },
        json: () => link,
        api: () => link,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  invite
    .command('delete <id>')
    .description('Delete an invite link by ID')
    .option('--force', 'Skip confirmation prompt')
    .action(async (id: string, opts) => {
      try {
        if (!opts.force) {
          printError(
            `This will permanently delete invite link #${id}. Re-run with --force to confirm.`,
          );
          process.exit(1);
        }
        await deleteInviteLink(parseInt(id, 10));
        printSuccess(`Deleted invite link #${id}.`);
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
