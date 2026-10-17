import { hasPermission, Permission } from '@server/lib/permissions';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('hasPermission edge cases', () => {
  it('grants Permission.NONE to every user', () => {
    assert.equal(hasPermission(Permission.NONE, Permission.NONE), true);
  });

  it('denies [Permission.NONE] although Permission.NONE alone is granted', () => {
    // inconsistent with the single permission case above
    assert.equal(hasPermission([Permission.NONE], Permission.REQUEST), false);
  });

  it('grants an empty list with type "and" even without permissions', () => {
    assert.equal(hasPermission([], Permission.NONE), true);
  });

  it('denies an empty list with type "or"', () => {
    assert.equal(hasPermission([], Permission.NONE, { type: 'or' }), false);
  });
});
