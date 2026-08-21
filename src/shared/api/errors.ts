/**
 * Every error the API emits passes through `common.api.api_exception_handler`,
 * which normalizes the body to `{ code, detail, fields }`.
 *
 * `fields` is populated only for validation errors; its keys are camelCased
 * serializer field names and its values are arrays of messages. Nested
 * serializers (`tax`) produce nested objects.
 */

export type ApiFieldErrors = Record<string, unknown>;

export type ApiErrorBody = {
  code: string;
  detail: string;
  fields: ApiFieldErrors;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly fields: ApiFieldErrors;

  constructor(status: number, body: Partial<ApiErrorBody> | null) {
    const detail = body?.detail ?? 'The request failed.';
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? 'error';
    this.detail = detail;
    this.fields = body?.fields ?? {};
  }

  get isValidation(): boolean {
    return this.status === 400;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 409 responses carry a domain code describing the workflow conflict. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  get isServer(): boolean {
    return this.status >= 500;
  }
}

/** Raised when the request never reached the server. */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(cause?: unknown) {
    super('Could not reach the server. Check your connection and try again.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Domain conflict codes raised by the approval and expense services. Each one
 * gets a specific, actionable message rather than a raw 409.
 */
export const CONFLICT_MESSAGES: Record<string, string> = {
  blocking_warning:
    'This report has blocking warnings. Resolve them on the flagged expenses before submitting.',
  empty_report: 'Add at least one expense before submitting this report.',
  invalid_approval_chain:
    'The approval chain must be contiguous and start at step 1. Ask an admin to fix it.',
  invalid_approver:
    'Every approver must be active, hold the Approver or Admin role, and not be the report owner.',
  invalid_expenses: 'Every expense must belong to the report owner and still be a draft.',
  not_current_approver: 'You are not the current approver for this report.',
  no_pending_step: 'There is no pending approval step on this report.',
  invalid_state_transition: 'This action is not allowed from the report’s current status.',
  submit_forbidden: 'Only the report owner or an admin can submit this report.',
  return_forbidden: 'Only the report owner or an admin can return this report to draft.',
  mark_paid_forbidden: 'Only an admin can mark a report as paid.',
  comment_forbidden: 'You cannot comment on this report.',
  approval_steps_locked:
    'Approval steps can only be edited by an admin while the report is a draft.',
  duplicate_step_order: 'Another step already uses that position in the chain.',
  report_not_owned: 'Only the report owner can add or edit expenses.',
  report_not_editable: 'Only a draft report’s owner or an admin can edit it.',
  report_not_deletable: 'This report can no longer be deleted.',
  category_in_use: 'This category is used by existing records and cannot be deleted.',
  invalid_credentials: 'Email or password is incorrect.',
  database_unavailable: 'The server database is unavailable. Try again shortly.',
};

/** A human-readable message for any thrown value. */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return CONFLICT_MESSAGES[error.code] ?? error.detail;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}

/**
 * Flatten DRF's nested `fields` into dot-paths that React Hook Form
 * understands, e.g. `{ tax: { rateBps: ["..."] } }` becomes
 * `{ "tax.rateBps": "..." }`.
 */
export function flattenFieldErrors(fields: ApiFieldErrors, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      const messages = value.filter((item): item is string => typeof item === 'string');
      if (messages.length > 0) flat[path] = messages.join(' ');
    } else if (typeof value === 'string') {
      flat[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(flat, flattenFieldErrors(value as ApiFieldErrors, path));
    }
  }

  return flat;
}

/**
 * Errors DRF cannot attach to a field arrive under `non_field_errors`, which
 * the camelCase renderer turns into `nonFieldErrors`.
 */
export const NON_FIELD_ERROR_KEYS = ['nonFieldErrors', 'non_field_errors', 'detail'];

export function extractFormErrors(error: unknown): {
  fieldErrors: Record<string, string>;
  formError: string | null;
} {
  if (!(error instanceof ApiError)) {
    return { fieldErrors: {}, formError: toMessage(error) };
  }

  const flat = flattenFieldErrors(error.fields);
  const formMessages: string[] = [];

  for (const key of NON_FIELD_ERROR_KEYS) {
    if (flat[key]) {
      formMessages.push(flat[key]);
      delete flat[key];
    }
  }

  const hasFieldErrors = Object.keys(flat).length > 0;
  const fallback = hasFieldErrors ? null : toMessage(error);

  return {
    fieldErrors: flat,
    formError: formMessages.length > 0 ? formMessages.join(' ') : fallback,
  };
}
