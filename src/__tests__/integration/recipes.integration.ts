import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import type { Recipe, PaginatedResponse } from '../../api/types';

// 12.4 Gate all integration tests behind TANDOOR_INTEGRATION=true
const INTEGRATION = process.env.TANDOOR_INTEGRATION === 'true';
const describeIf = INTEGRATION ? describe : describe.skip;

// Build a fresh axios client from env vars — avoids the shared apiClient singleton
// which is initialised at module load time using the config singleton.
function makeClient(token?: string) {
  const baseURL = `${process.env.TANDOOR_URL}/api`;
  const authToken = token ?? process.env.TANDOOR_API_TOKEN;
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${authToken}` },
    validateStatus: () => true, // never throw on HTTP errors — we assert manually
  });
}

// 12.1 Auth tests
describeIf('Integration: auth', () => {
  it('valid token returns HTTP 200 from /api/recipe/', async () => {
    const client = makeClient();
    const res = await client.get<PaginatedResponse<Recipe>>('/recipe/');
    expect(res.status).toBe(200);
  });

  it('invalid token returns HTTP 401 from /api/recipe/', async () => {
    const client = makeClient('invalid-token-xyz');
    const res = await client.get('/recipe/');
    expect(res.status).toBe(401);
  });
});

// 12.2 Full recipe CRUD round-trip: add → get → update → delete
describeIf('Integration: recipe CRUD round-trip', () => {
  let createdId: number;

  beforeAll(() => {
    if (!process.env.TANDOOR_URL || !process.env.TANDOOR_API_TOKEN) {
      throw new Error(
        'TANDOOR_URL and TANDOOR_API_TOKEN must be set to run integration tests',
      );
    }
  });

  it('creates a recipe (add)', async () => {
    const client = makeClient();
    const payload = {
      name: 'Integration Test Recipe',
      description: 'Created by integration test',
      servings: 2,
      working_time: 10,
      waiting_time: 5,
      steps: [
        {
          instruction: 'Mix everything together.',
          order: 1,
          ingredients: [
            { food: { name: 'flour' }, unit: { name: 'cups' }, amount: 2 },
          ],
        },
      ],
    };
    const res = await client.post<Recipe>('/recipe/', payload);
    expect(res.status).toBe(201);
    expect(res.data.name).toBe('Integration Test Recipe');
    createdId = res.data.id;
  });

  it('retrieves the created recipe by ID (get)', async () => {
    const client = makeClient();
    const res = await client.get<Recipe>(`/recipe/${createdId}/`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(createdId);
    expect(res.data.name).toBe('Integration Test Recipe');
  });

  it('updates the recipe name (update)', async () => {
    const client = makeClient();
    const res = await client.patch<Recipe>(`/recipe/${createdId}/`, {
      name: 'Integration Test Recipe (updated)',
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('Integration Test Recipe (updated)');
  });

  it('deletes the recipe (delete)', async () => {
    const client = makeClient();
    const delRes = await client.delete(`/recipe/${createdId}/`);
    expect(delRes.status).toBe(204);
  });

  it('returns 404 after deletion (verify gone)', async () => {
    const client = makeClient();
    const res = await client.get(`/recipe/${createdId}/`);
    expect(res.status).toBe(404);
  });
});
