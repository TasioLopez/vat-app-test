import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  allowedRoleOptions,
  canAccessUsersAdmin,
  canChangeUserRole,
  canDeleteUsers,
  canInviteUsers,
} from '../roles';

describe('canAccessUsersAdmin', () => {
  it('allows admin and back_office only', () => {
    assert.equal(canAccessUsersAdmin('admin'), true);
    assert.equal(canAccessUsersAdmin('back_office'), true);
    assert.equal(canAccessUsersAdmin('user'), false);
  });
});

describe('canInviteUsers / canDeleteUsers', () => {
  it('are admin-only', () => {
    assert.equal(canInviteUsers('admin'), true);
    assert.equal(canDeleteUsers('admin'), true);
    assert.equal(canInviteUsers('back_office'), false);
    assert.equal(canDeleteUsers('back_office'), false);
    assert.equal(canInviteUsers('user'), false);
  });
});

describe('canChangeUserRole', () => {
  const admin = 'admin-id';
  const bo = 'bo-id';
  const user = 'user-id';

  it('allows no-op same role for anyone', () => {
    assert.equal(canChangeUserRole('back_office', bo, user, 'user', 'user'), true);
    assert.equal(canChangeUserRole('back_office', bo, bo, 'back_office', 'back_office'), true);
  });

  it('allows admin any change', () => {
    assert.equal(canChangeUserRole('admin', admin, user, 'user', 'admin'), true);
    assert.equal(canChangeUserRole('admin', admin, bo, 'back_office', 'user'), true);
    assert.equal(canChangeUserRole('admin', admin, admin, 'admin', 'user'), true);
  });

  it('allows back_office to promote user to back_office only', () => {
    assert.equal(canChangeUserRole('back_office', bo, user, 'user', 'back_office'), true);
  });

  it('blocks back_office self role change', () => {
    assert.equal(canChangeUserRole('back_office', bo, bo, 'back_office', 'user'), false);
    assert.equal(canChangeUserRole('back_office', bo, bo, 'back_office', 'admin'), false);
  });

  it('blocks back_office from touching admin or granting admin', () => {
    assert.equal(canChangeUserRole('back_office', bo, admin, 'admin', 'user'), false);
    assert.equal(canChangeUserRole('back_office', bo, admin, 'admin', 'back_office'), false);
    assert.equal(canChangeUserRole('back_office', bo, user, 'user', 'admin'), false);
  });

  it('blocks back_office demote of back_office', () => {
    assert.equal(canChangeUserRole('back_office', bo, 'other-bo', 'back_office', 'user'), false);
  });

  it('blocks standard user from any role change', () => {
    assert.equal(canChangeUserRole('user', user, 'other', 'user', 'back_office'), false);
  });
});

describe('allowedRoleOptions', () => {
  it('for back_office editing a user includes only user and back_office', () => {
    assert.deepEqual(
      allowedRoleOptions('back_office', 'bo', 'u1', 'user').sort(),
      ['back_office', 'user'].sort()
    );
  });

  it('for back_office editing self is only current role', () => {
    assert.deepEqual(allowedRoleOptions('back_office', 'bo', 'bo', 'back_office'), [
      'back_office',
    ]);
  });

  it('for admin includes all roles', () => {
    assert.deepEqual(allowedRoleOptions('admin', 'a', 'u1', 'user').sort(), [
      'admin',
      'back_office',
      'user',
    ].sort());
  });
});
