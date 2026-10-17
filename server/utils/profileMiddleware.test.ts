import type { User } from '@server/entity/User';
import { Permission } from '@server/lib/permissions';
import {
  isOwnProfile,
  isOwnProfileOrAdmin,
} from '@server/utils/profileMiddleware';
import type { NextFunction, Request, Response } from 'express';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const forbidden = {
  status: 403,
  message: "You do not have permission to view this user's settings.",
};

// fake user: only the fields the middleware reads, with a stubbed permission check
const fakeUser = (id: number, canManageUsers = false) => {
  const hasPermission = mock.fn(() => canManageUsers);
  return { user: { id, hasPermission } as unknown as User, hasPermission };
};

// runs the middleware against a fake request and returns the mocked next()
const run = (middleware: Middleware, user: User | undefined, id: string) => {
  const req = { user, params: { id } } as unknown as Request;
  const next = mock.fn();

  middleware(req, {} as Response, next as unknown as NextFunction);

  return next;
};

describe('isOwnProfile', () => {
  it('lets a user through to their own profile', () => {
    const next = run(isOwnProfile(), fakeUser(5).user, '5');

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(next.mock.calls[0].arguments, []);
  });

  it("rejects a user viewing someone else's profile", () => {
    const next = run(isOwnProfile(), fakeUser(5).user, '6');

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(next.mock.calls[0].arguments, [forbidden]);
  });

  it('rejects a request without a logged in user', () => {
    const next = run(isOwnProfile(), undefined, '5');

    assert.deepEqual(next.mock.calls[0].arguments, [forbidden]);
  });
});

describe('isOwnProfileOrAdmin', () => {
  it('lets a user without MANAGE_USERS through to their own profile', () => {
    const next = run(isOwnProfileOrAdmin(), fakeUser(5).user, '5');

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(next.mock.calls[0].arguments, []);
  });

  it("lets a user with MANAGE_USERS view someone else's profile", () => {
    const { user, hasPermission } = fakeUser(1, true);

    const next = run(isOwnProfileOrAdmin(), user, '6');

    assert.deepEqual(hasPermission.mock.calls[0].arguments, [
      Permission.MANAGE_USERS,
    ]);
    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(next.mock.calls[0].arguments, []);
  });

  it("rejects a user without MANAGE_USERS viewing someone else's profile", () => {
    const next = run(isOwnProfileOrAdmin(), fakeUser(5).user, '6');

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(next.mock.calls[0].arguments, [forbidden]);
  });
});
