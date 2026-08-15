import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './AppError.js';

describe('AppError subclasses', () => {
  it('ValidationError: statusCode 400, instanceof Error + AppError', () => {
    const err = new ValidationError('invalid input');
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'invalid input');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AppError);
    assert.ok(err instanceof ValidationError);
    assert.equal(err.name, 'ValidationError');
  });

  it('UnauthorizedError: statusCode 401', () => {
    const err = new UnauthorizedError('not logged in');
    assert.equal(err.statusCode, 401);
    assert.ok(err instanceof AppError);
  });

  it('ForbiddenError: statusCode 403', () => {
    const err = new ForbiddenError('no permission');
    assert.equal(err.statusCode, 403);
    assert.ok(err instanceof AppError);
  });

  it('NotFoundError: statusCode 404', () => {
    const err = new NotFoundError('not found');
    assert.equal(err.statusCode, 404);
    assert.ok(err instanceof AppError);
  });

  it('ConflictError: statusCode 409', () => {
    const err = new ConflictError('already exists');
    assert.equal(err.statusCode, 409);
    assert.ok(err instanceof AppError);
  });

  it('non-AppError error is identifiable as such', () => {
    const plain = new Error('surprise');
    assert.ok(!(plain instanceof AppError));
  });
});
