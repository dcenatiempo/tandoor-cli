import { apiClient } from './client';
import { Household, InviteLink, UserSpace, TandoorUser, PaginatedResponse } from './types';

// ── Households ────────────────────────────────────────────────────────────────
// Note: The /household/ endpoint is restricted in Tandoor and requires special permissions.
// We provide these functions for completeness, but they may return 403 errors.
// Household data can be read through /user-space/ which is more widely accessible.

export async function listHouseholds(): Promise<Household[]> {
  const res = await apiClient.get<PaginatedResponse<Household>>('/household/');
  return res.data.results;
}

export async function getHousehold(id: number): Promise<Household> {
  const res = await apiClient.get<Household>(`/household/${id}/`);
  return res.data;
}

export async function createHousehold(name: string): Promise<Household> {
  const res = await apiClient.post<Household>('/household/', { name });
  return res.data;
}

export async function updateHousehold(id: number, name: string): Promise<Household> {
  const res = await apiClient.patch<Household>(`/household/${id}/`, { name });
  return res.data;
}

export async function deleteHousehold(id: number): Promise<void> {
  await apiClient.delete(`/household/${id}/`);
}

/**
 * Extract unique households from user-space memberships.
 * This is a workaround for the restricted /household/ endpoint.
 */
export async function listHouseholdsFromUserSpace(): Promise<Household[]> {
  const userSpaces = await listUserSpaces();
  const householdMap = new Map<number, Household>();
  userSpaces.forEach((us) => {
    if (us.household) {
      householdMap.set(us.household.id, us.household);
    }
  });
  return Array.from(householdMap.values());
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<TandoorUser[]> {
  const res = await apiClient.get<TandoorUser[]>('/user/');
  return res.data;
}

// ── User-Space (household membership) ────────────────────────────────────────

export async function listUserSpaces(): Promise<UserSpace[]> {
  const res = await apiClient.get<PaginatedResponse<UserSpace>>('/user-space/');
  return res.data.results;
}

export async function assignUserToHousehold(
  userSpaceId: number,
  householdId: number,
): Promise<UserSpace> {
  const res = await apiClient.patch<UserSpace>(`/user-space/${userSpaceId}/`, {
    household: { id: householdId },
  });
  return res.data;
}

// ── Invite Links ──────────────────────────────────────────────────────────────

export async function listInviteLinks(): Promise<InviteLink[]> {
  const res = await apiClient.get<PaginatedResponse<InviteLink>>('/invite-link/');
  return res.data.results;
}

export async function createInviteLink(
  householdId: number,
  opts: { email?: string; expiryDate?: string; groupId?: number } = {},
): Promise<InviteLink> {
  const payload: Record<string, unknown> = {
    household: householdId,
    group: opts.groupId ?? 2, // Default to "user" group (ID 2)
  };
  if (opts.email) payload.email = opts.email;
  if (opts.expiryDate) payload.valid_until = opts.expiryDate;
  const res = await apiClient.post<InviteLink>('/invite-link/', payload);
  return res.data;
}

export async function deleteInviteLink(id: number): Promise<void> {
  await apiClient.delete(`/invite-link/${id}/`);
}
