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
import { printJson, printSuccess, printError } from '../output/formatter';
import { Household, InviteLink, TandoorUser, UserSpace } from '../api/types';

// ── Formatters ────────────────────────────────────────────────────────────────

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

// ── Command registration ──────────────────────────────────────────────────────

export function registerHouseholdCommand(program: Command): void {
  const household = program
    .command('household')
    .description('Manage households, users, and invite links');

  // ── household list ──────────────────────────────────────────────────────────
  household
    .command('list')
    .description('List all households')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        let households: Household[];
        try {
          // Try the direct endpoint first
          households = await listHouseholds();
        } catch (err) {
          // Fall back to extracting from user-space if the direct endpoint fails
          if (err instanceof Error && err.message.includes('403')) {
            households = await listHouseholdsFromUserSpace();
          } else {
            throw err;
          }
        }
        if (opts.json) {
          printJson(households);
        } else if (households.length === 0) {
          console.log('No households found.');
        } else {
          households.forEach(formatHousehold);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // ── household get <id> ──────────────────────────────────────────────────────
  household
    .command('get <id>')
    .description('Get details of a household by ID')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts) => {
      try {
        const h = await getHousehold(parseInt(id, 10));
        if (opts.json) {
          printJson(h);
        } else {
          formatHousehold(h);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // ── household add <name> ────────────────────────────────────────────────────
  household
    .command('add <name>')
    .description('Create a new household')
    .option('--json', 'Output as JSON')
    .action(async (name: string, opts) => {
      try {
        const h = await createHousehold(name);
        if (opts.json) {
          printJson(h);
        } else {
          printSuccess(`Created household "${h.name}" (ID: ${h.id}).`);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // ── household edit <id> ─────────────────────────────────────────────────────
  household
    .command('edit <id>')
    .description('Rename a household')
    .requiredOption('--name <name>', 'New name for the household')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts) => {
      try {
        const h = await updateHousehold(parseInt(id, 10), opts.name);
        if (opts.json) {
          printJson(h);
        } else {
          printSuccess(`Household #${h.id} renamed to "${h.name}".`);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // ── household delete <id> ───────────────────────────────────────────────────
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

  // ── household users ─────────────────────────────────────────────────────────
  const users = household
    .command('users')
    .description('Manage users and household membership');

  users
    .command('list')
    .description('List all users in the space')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const userList = await listUsers();
        if (opts.json) {
          printJson(userList);
        } else if (userList.length === 0) {
          console.log('No users found.');
        } else {
          userList.forEach(formatUser);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  users
    .command('memberships')
    .description('List all user-space memberships (shows which household each user belongs to)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const memberships = await listUserSpaces();
        if (opts.json) {
          printJson(memberships);
        } else if (memberships.length === 0) {
          console.log('No memberships found.');
        } else {
          memberships.forEach(formatUserSpace);
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  users
    .command('assign <user-space-id> <household-id>')
    .description('Assign a user (by their user-space ID) to a different household')
    .option('--json', 'Output as JSON')
    .action(async (userSpaceId: string, householdId: string, opts) => {
      try {
        const updated = await assignUserToHousehold(
          parseInt(userSpaceId, 10),
          parseInt(householdId, 10),
        );
        if (opts.json) {
          printJson(updated);
        } else {
          const householdName = updated.household?.name ?? `#${householdId}`;
          printSuccess(
            `User "${updated.user.display_name}" assigned to household "${householdName}".`,
          );
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // ── household invite ────────────────────────────────────────────────────────
  const invite = household
    .command('invite')
    .description('Manage invite links (the way to add new users to a household)');

  invite
    .command('list')
    .description('List all invite links')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const links = await listInviteLinks();
        if (opts.json) {
          printJson(links);
        } else if (links.length === 0) {
          console.log('No invite links found.');
        } else {
          const baseUrl = process.env.TANDOOR_URL ?? 'http://localhost:8050';
          links.forEach((l) => formatInviteLink(l, baseUrl));
        }
      } catch (err: unknown) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  invite
    .command('create <household-id>')
    .description('Create an invite link for a household (requires admin privileges)')
    .option('--email <email>', 'Pre-fill the invitee email address')
    .option('--expires <YYYY-MM-DD>', 'Set an expiry date for the link')
    .option('--group-id <id>', 'Group ID to assign the new user to (default: 2 for "user" group)')
    .option('--json', 'Output as JSON')
    .action(async (householdId: string, opts) => {
      try {
        const link = await createInviteLink(parseInt(householdId, 10), {
          email: opts.email,
          expiryDate: opts.expires,
          groupId: opts.groupId ? parseInt(opts.groupId, 10) : undefined,
        });
        if (opts.json) {
          printJson(link);
        } else {
          const baseUrl = process.env.TANDOOR_URL ?? 'http://localhost:8050';
          const url = `${baseUrl}/invite/${link.uuid}/`;
          printSuccess(`Invite link created for household #${householdId}:`);
          console.log(`  ${url}`);
          const groupName = typeof link.group === 'object' ? link.group.name : link.group;
          console.log(`  Group: ${groupName}`);
          if (link.valid_until) {
            console.log(`  Expires: ${new Date(link.valid_until).toLocaleDateString()}`);
          }
        }
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
