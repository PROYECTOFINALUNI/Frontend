/**
 * La API normaliza los errores con el formato `{ code, detail, fields }`. `fields` solo contiene errores de validación y puede incluir objetos anidados */

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

  /** Las respuestas 409 incluyen un código que indica el conflicto del flujo de trabajo */
  get isConflict(): boolean {
    return this.status === 409;
  }

  get isServer(): boolean {
    return this.status >= 500;
  }
}

/** Se lanza cuando la solicitud no llega al servidor. */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(cause?: unknown) {
    super('Could not reach the server. Check your connection and try again.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/** Códigos de conflicto del dominio con mensajes específicos para errores 409. */
export const CONFLICT_MESSAGES: Record<string, string> = {
  blocking_warning:
    'Este informe tiene avisos bloqueantes. Resuélvelos en los gastos marcados antes de enviarlo.',
  empty_report:
    'Añade al menos un gasto antes de enviar este informe.',
  invalid_approval_chain:
    'La cadena de aprobación debe ser continua y empezar en el paso 1. Pide a un administrador que la corrija.',
  invalid_approver:
    'Todos los aprobadores deben estar activos, tener el rol de Aprobador o Administrador y no ser el propietario del informe.',
  invalid_expenses:
    'Todos los gastos deben pertenecer al propietario del informe y seguir en estado borrador.',
  not_current_approver:
    'No eres el aprobador actual de este informe.',
  no_pending_step:
    'No hay ningún paso de aprobación pendiente en este informe.',
  invalid_state_transition:
    'Esta acción no está permitida desde el estado actual del informe.',
  submit_forbidden:
    'Solo el propietario del informe o un administrador pueden enviarlo.',
  return_forbidden:
    'Solo el propietario del informe o un administrador pueden devolverlo a borrador.',
  mark_paid_forbidden:
    'Solo un administrador puede marcar un informe como pagado.',
  comment_forbidden:
    'No puedes añadir comentarios a este informe.',
  approval_steps_locked:
    'Los pasos de aprobación solo pueden ser editados por un administrador mientras el informe esté en borrador.',
  duplicate_step_order:
    'Ya existe otro paso en esa posición de la cadena.',
  report_not_owned:
    'Solo el propietario del informe puede añadir o editar gastos.',
  report_not_editable:
    'Solo el propietario de un informe en borrador o un administrador pueden editarlo.',
  report_not_deletable:
    'Este informe ya no se puede eliminar.',
  category_in_use:
    'Esta categoría está siendo utilizada y no se puede eliminar.',
  invalid_credentials:
    'Email o contraseña incorrecta.',
  database_unavailable:
    'La base de datos del servidor no está disponible. Inténtalo de nuevo en unos instantes.',
};

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
  return 'Algo ha ido mal.';
}

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
