import { z } from 'zod';

import {
  CURRENCY_MINOR_UNITS,
  MAX_TAX_RATE_BPS,
  SUPPORTED_CURRENCIES,
  isValidDecimalString,
} from '@/shared/money/money';
import type { CategoryField } from '@/shared/types/domain';

const currencyEnum = z.enum(
  SUPPORTED_CURRENCIES as [
    keyof typeof CURRENCY_MINOR_UNITS,
    ...Array<keyof typeof CURRENCY_MINOR_UNITS>,
  ]
);

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const reportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

/** Mirrors ExpenseFieldValue.value_number, a DecimalField with four decimal places. */
const CUSTOM_NUMBER_PATTERN = /^-?\d+(\.\d{1,4})?$/;
const CUSTOM_TEXT_MAX_LENGTH = 500;

const expenseBaseSchema = z.object({
  merchant: z
    .string()
    .trim()
    .min(1, 'Merchant is required')
    .max(200, 'Merchant cannot exceed 200 characters'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  categoryId: z.string(),
  currency: currencyEnum,
  amountDecimal: z.string().min(1, 'Amount is required'),
  taxRateBps: z
    .number({ invalid_type_error: 'Tax rate is required' })
    .int('Tax rate must be a whole number of basis points')
    .min(0, 'Tax rate cannot be negative')
    .max(MAX_TAX_RATE_BPS, 'Tax rate cannot exceed 100%'),
  taxIncluded: z.boolean(),
});

/** Formulario de gastos con validación adaptada a la moneda y a la categoría seleccionadas. Los campos personalizados se validan según la categoría y se descartan valores de categorías anteriores.
 */
export function makeExpenseSchema(fields: CategoryField[]) {
  const shape: z.ZodRawShape = Object.fromEntries(
    fields.map((field) => [field.id, field.fieldType === 'BOOLEAN' ? z.boolean() : z.string()])
  );

  return expenseBaseSchema.extend({ customFields: z.object(shape) }).superRefine((values, ctx) => {
    if (values.amountDecimal && !isValidDecimalString(values.amountDecimal, values.currency)) {
      const digits = CURRENCY_MINOR_UNITS[values.currency];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountDecimal'],
        message:
          digits === 0
            ? `${values.currency} does not use decimal places`
            : `Enter a positive amount with at most ${digits} decimal places for ${values.currency}`,
      });
    }

    for (const field of fields) {
      const value = values.customFields[field.id];
      if (typeof value !== 'string') continue;

      const path = ['customFields', field.id];
      const trimmed = value.trim();
      if (!trimmed) {
        if (field.required) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `${field.name} is required`,
          });
        }
        continue;
      }
      if (field.fieldType === 'NUMBER' && !CUSTOM_NUMBER_PATTERN.test(trimmed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${field.name} must be a number with at most 4 decimal places`,
        });
      }
      if (field.fieldType === 'TEXT' && trimmed.length > CUSTOM_TEXT_MAX_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${field.name} cannot exceed ${CUSTOM_TEXT_MAX_LENGTH} characters`,
        });
      }
    }
  });
}

export type ExpenseFormValues = z.infer<ReturnType<typeof makeExpenseSchema>>;

/** El `id` está vacío en los campos nuevos y se elimina antes de enviarlos a la API. */
export const categoryFieldSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, 'Field name is required')
    .max(100, 'Field name cannot exceed 100 characters'),
  fieldType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN']),
  required: z.boolean(),
  active: z.boolean(),
});

export const categorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Code is required')
      .max(32, 'Code cannot exceed 32 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores only'),
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name cannot exceed 100 characters'),
    active: z.boolean(),
    customFields: z.array(categoryFieldSchema),
  })
  .superRefine((values, ctx) => {
    const firstSeenAt = new Map<string, number>();
    values.customFields.forEach((field, index) => {
      const key = field.name.trim().toLowerCase();
      if (!key) return;
      if (firstSeenAt.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customFields', index, 'name'],
          message: 'Field names must be unique within a category',
        });
      } else {
        firstSeenAt.set(key, index);
      }
    });
  });

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const warningRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name cannot exceed 120 characters'),
    categoryId: z.string(),
    currency: currencyEnum,
    thresholdDecimal: z.string().min(1, 'Threshold is required'),
    severity: z.enum(['INFO', 'WARNING', 'BLOCKING']),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(255, 'Message cannot exceed 255 characters'),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.thresholdDecimal) return;

    if (!isValidDecimalString(values.thresholdDecimal, values.currency)) {
      const digits = CURRENCY_MINOR_UNITS[values.currency];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdDecimal'],
        message:
          digits === 0
            ? `${values.currency} does not use decimal places`
            : `Enter a threshold with at most ${digits} decimal places for ${values.currency}`,
      });
    }
  });

export type WarningRuleFormValues = z.infer<typeof warningRuleSchema>;

export const orgAttributeSchema = z.object({
  dimension: z.enum(['LOCATION', 'DEPARTMENT', 'POSITION']),
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(32, 'Code cannot exceed 32 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores only'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  active: z.boolean(),
});

export type OrgAttributeFormValues = z.infer<typeof orgAttributeSchema>;

/** Las opciones vacías representan "Cualquiera" y se envían como `null` a la API. */
export const approvalRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name cannot exceed 120 characters'),
    priority: z
      .number({ invalid_type_error: 'Priority is required' })
      .int('Priority must be a whole number')
      .min(0, 'Priority cannot be negative')
      .max(10000, 'Priority cannot exceed 10000'),
    categoryId: z.string(),
    currency: currencyEnum,
    thresholdDecimal: z.string().min(1, 'Threshold is required'),
    submitterLocationId: z.string(),
    submitterDepartmentId: z.string(),
    submitterPositionId: z.string(),
    approverRole: z.union([z.enum(['APPROVER', 'ADMIN']), z.literal('')]),
    approverLocationId: z.string(),
    approverDepartmentId: z.string(),
    approverPositionId: z.string(),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.thresholdDecimal) return;

    if (!isValidDecimalString(values.thresholdDecimal, values.currency)) {
      const digits = CURRENCY_MINOR_UNITS[values.currency];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdDecimal'],
        message:
          digits === 0
            ? `${values.currency} does not use decimal places`
            : `Enter a threshold with at most ${digits} decimal places for ${values.currency}`,
      });
    }
  });

export type ApprovalRuleFormValues = z.infer<typeof approvalRuleSchema>;

/** Django rechaza por defecto las contraseñas con menos de 8 caracteres. */
const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters');

export const userCreateSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(255, 'Full name cannot exceed 255 characters'),
  role: z.enum(['EMPLOYEE', 'APPROVER', 'ADMIN']),
  active: z.boolean(),
  password: passwordField,
  locationId: z.string(),
  departmentId: z.string(),
  positionId: z.string(),
});

export type UserCreateFormValues = z.infer<typeof userCreateSchema>;

export const setPasswordSchema = z.object({
  password: passwordField,
});

export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

/** El backend requiere un comentario no vacío al rechazar. */
export const rejectSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'A comment is required when rejecting a report')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;

export const commentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

export type CommentFormValues = z.infer<typeof commentSchema>;

export const approvalStepSchema = z.object({
  approverId: z.string().min(1, 'Select an approver'),
  stepOrder: z
    .number({ invalid_type_error: 'Step order is required' })
    .int('Step order must be a whole number')
    .min(1, 'Step order starts at 1'),
});

export type ApprovalStepFormValues = z.infer<typeof approvalStepSchema>;

export const delegateSchema = z.object({
  approverId: z.string().min(1, 'Select an approver'),
  comment: z.string().trim().max(2000, 'Comment cannot exceed 2000 characters'),
});

export type DelegateFormValues = z.infer<typeof delegateSchema>;
