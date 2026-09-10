import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEffectiveAccessMaps,
  fetchAllPaged,
  hasUnrestrictedOrgAccess,
} from '../effective-access';

describe('hasUnrestrictedOrgAccess', () => {
  it('is true for admin and back_office', () => {
    assert.equal(hasUnrestrictedOrgAccess('admin'), true);
    assert.equal(hasUnrestrictedOrgAccess('back_office'), true);
  });

  it('is false for regular users', () => {
    assert.equal(hasUnrestrictedOrgAccess('user'), false);
    assert.equal(hasUnrestrictedOrgAccess(null), false);
  });
});

describe('buildEffectiveAccessMaps', () => {
  const employees = [
    { id: 'e1', client_id: 'c1', owner_id: 'u1' },
    { id: 'e2', client_id: 'c2', owner_id: null },
    { id: 'e3', client_id: 'c1', owner_id: 'u2' },
  ];

  it('unions owner_id and employee_users for werknemers', () => {
    const { effectiveEmployees } = buildEffectiveAccessMaps({
      employees,
      userClients: {},
      userEmployees: { u1: ['e2'] },
    });
    assert.deepEqual(new Set(effectiveEmployees.u1), new Set(['e1', 'e2']));
  });

  it('derives werkgevers from explicit user_clients and employee clients', () => {
    const { effectiveClients } = buildEffectiveAccessMaps({
      employees,
      userClients: { u1: ['c3'] },
      userEmployees: { u1: ['e2'] },
    });
    // owned e1 → c1, assigned e2 → c2, explicit → c3
    assert.deepEqual(new Set(effectiveClients.u1), new Set(['c1', 'c2', 'c3']));
  });

  it('does not grant all employees of a client from user_clients alone', () => {
    const { effectiveEmployees, effectiveClients } = buildEffectiveAccessMaps({
      employees,
      userClients: { u9: ['c1'] },
      userEmployees: {},
    });
    assert.deepEqual(effectiveClients.u9, ['c1']);
    assert.equal(effectiveEmployees.u9?.length ?? 0, 0);
  });
});

describe('fetchAllPaged', () => {
  it('aggregates pages until a short page', async () => {
    const pages = [
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }],
    ];
    let calls = 0;
    const rows = await fetchAllPaged(async () => {
      const page = pages[calls++] ?? [];
      return { data: page, error: null };
    }, 2);
    assert.deepEqual(
      rows.map((r) => r.id),
      [1, 2, 3]
    );
    assert.equal(calls, 2);
  });

  it('throws on page error', async () => {
    await assert.rejects(
      () => fetchAllPaged(async () => ({ data: null, error: { message: 'boom' } })),
      /boom/
    );
  });
});
