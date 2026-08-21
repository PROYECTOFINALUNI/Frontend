import { describe, expect, it } from 'vitest';

import { ApiError, extractFormErrors, flattenFieldErrors, toMessage } from './errors';

describe('flattenFieldErrors', () => {
  it('joins an array of messages into one string', () => {
    expect(flattenFieldErrors({ merchant: ['This field is required.'] })).toEqual({
      merchant: 'This field is required.',
    });
  });

  it('flattens nested serializer errors into dot paths', () => {
    const fields = { tax: { rateBps: ['Ensure this value is less than or equal to 10000.'] } };

    expect(flattenFieldErrors(fields)).toEqual({
      'tax.rateBps': 'Ensure this value is less than or equal to 10000.',
    });
  });

  it('joins multiple messages for the same field', () => {
    expect(flattenFieldErrors({ password: ['Too short.', 'Too common.'] })).toEqual({
      password: 'Too short. Too common.',
    });
  });

  it('ignores empty arrays', () => {
    expect(flattenFieldErrors({ merchant: [] })).toEqual({});
  });
});

describe('extractFormErrors', () => {
  it('separates field errors from the form-level message', () => {
    const error = new ApiError(400, {
      code: 'invalid',
      detail: 'Validation failed.',
      fields: { merchant: ['Required.'], nonFieldErrors: ['Amount must be positive.'] },
    });

    expect(extractFormErrors(error)).toEqual({
      fieldErrors: { merchant: 'Required.' },
      formError: 'Amount must be positive.',
    });
  });

  it('falls back to the detail when no field carries the error', () => {
    const error = new ApiError(403, {
      code: 'permission_denied',
      detail: 'You do not have permission.',
      fields: {},
    });

    expect(extractFormErrors(error)).toEqual({
      fieldErrors: {},
      formError: 'You do not have permission.',
    });
  });

  it('suppresses the generic message when specific fields already explain it', () => {
    const error = new ApiError(400, {
      code: 'invalid',
      detail: 'Validation failed.',
      fields: { merchant: ['Required.'] },
    });

    expect(extractFormErrors(error).formError).toBeNull();
  });
});

describe('toMessage', () => {
  it('maps a domain conflict code to a specific explanation', () => {
    const error = new ApiError(409, {
      code: 'blocking_warning',
      detail: 'Report has blocking warnings.',
      fields: {},
    });

    expect(toMessage(error)).toContain('blocking warnings');
    expect(toMessage(error)).not.toBe('Report has blocking warnings.');
  });

  it('falls back to the server detail for an unrecognised code', () => {
    const error = new ApiError(409, { code: 'something_new', detail: 'Nope.', fields: {} });

    expect(toMessage(error)).toBe('Nope.');
  });
});

describe('ApiError status helpers', () => {
  it('classifies statuses', () => {
    expect(new ApiError(400, null).isValidation).toBe(true);
    expect(new ApiError(401, null).isUnauthenticated).toBe(true);
    expect(new ApiError(403, null).isForbidden).toBe(true);
    expect(new ApiError(404, null).isNotFound).toBe(true);
    expect(new ApiError(409, null).isConflict).toBe(true);
    expect(new ApiError(503, null).isServer).toBe(true);
  });
});
