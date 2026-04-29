import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import type { MealPlan, PaginatedResponse } from '../../api/types';

// 12.4 Gate all integration tests behind TANDOOR_INTEGRATION=true
const INTEGRATION = process.env.TANDOOR_INTEGRATION === 'true';
const describeIf = INTEGRATION ? describe : describe.skip;

function makeClient() {
  return axios.create({
    baseURL: `${process.env.TANDOOR_URL}/api`,
    headers: { Authorization: `Bearer ${process.env.TANDOOR_API_TOKEN}` },
    validateStatus: () => true,
  });
}

// 12.3 Meal plan list integration test
describeIf('Integration: mealplan list', () => {
  beforeAll(() => {
    if (!process.env.TANDOOR_URL || !process.env.TANDOOR_API_TOKEN) {
      throw new Error(
        'TANDOOR_URL and TANDOOR_API_TOKEN must be set to run integration tests',
      );
    }
  });

  it('listMealPlans() returns an array', async () => {
    const client = makeClient();
    const res = await client.get<PaginatedResponse<MealPlan>>('/meal-plan/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.results)).toBe(true);
  });
});
