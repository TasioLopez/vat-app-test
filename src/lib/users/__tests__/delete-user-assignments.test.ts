import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  allEmployeesHaveNewOwner,
  summarizeOwnerAssignments,
  toRpcAssignments,
  validateDeleteUserAssignments,
} from '../delete-user-assignments';

const FROM = 'user-a';
const E1 = 'emp-1';
const E2 = 'emp-2';
const E3 = 'emp-3';
const B = 'user-b';
const C = 'user-c';

describe('validateDeleteUserAssignments', () => {
  it('accepts empty assignments when user owns nothing', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [],
      assignments: [],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.assignments, []);
  });

  it('requires full coverage', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1, E2],
      assignments: [{ employeeId: E1, ownerId: B }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /2 dossiers/);
  });

  it('rejects assigning back to the deleted user', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1],
      assignments: [{ employeeId: E1, ownerId: FROM }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /te verwijderen/);
  });

  it('rejects duplicate employee rows', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1, E2],
      assignments: [
        { employeeId: E1, ownerId: B },
        { employeeId: E1, ownerId: C },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Dubbele/);
  });

  it('rejects employees not owned by the user', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1],
      assignments: [{ employeeId: E3, ownerId: B }],
    });
    assert.equal(result.ok, false);
  });

  it('accepts split reassignment to multiple owners', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1, E2, E3],
      assignments: [
        { employeeId: E1, ownerId: B },
        { employeeId: E2, ownerId: C },
        { employeeId: E3, ownerId: B },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.assignments.length, 3);
      assert.deepEqual(toRpcAssignments(result.assignments), [
        { employee_id: E1, owner_id: B },
        { employee_id: E2, owner_id: C },
        { employee_id: E3, owner_id: B },
      ]);
    }
  });

  it('dedupes owned ids when counting coverage', () => {
    const result = validateDeleteUserAssignments({
      fromUserId: FROM,
      ownedEmployeeIds: [E1, E1],
      assignments: [{ employeeId: E1, ownerId: B }],
    });
    assert.equal(result.ok, true);
  });
});

describe('allEmployeesHaveNewOwner', () => {
  it('is true for empty list', () => {
    assert.equal(allEmployeesHaveNewOwner([], {}, FROM), true);
  });

  it('requires every row and excludes self', () => {
    assert.equal(
      allEmployeesHaveNewOwner([E1, E2], { [E1]: B, [E2]: null }, FROM),
      false
    );
    assert.equal(
      allEmployeesHaveNewOwner([E1], { [E1]: FROM }, FROM),
      false
    );
    assert.equal(
      allEmployeesHaveNewOwner([E1, E2], { [E1]: B, [E2]: C }, FROM),
      true
    );
  });
});

describe('summarizeOwnerAssignments', () => {
  it('counts per owner and ignores empty', () => {
    assert.deepEqual(
      summarizeOwnerAssignments({ [E1]: B, [E2]: B, [E3]: C, x: null }),
      [
        { ownerId: B, count: 2 },
        { ownerId: C, count: 1 },
      ]
    );
  });
});
