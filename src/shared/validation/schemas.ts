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
  email: z
    .string()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Introduce un correo electrónico válido'),

  password: z
    .string()
    .min(1, 'La contraseña es obligatoria'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const reportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(200, 'El título no puede superar los 200 caracteres'),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

/** Mirrors ExpenseFieldValue.value_number, a DecimalField with four decimal places. */
const CUSTOM_NUMBER_PATTERN = /^-?\d+(\.\d{1,4})?$/;

const CUSTOM_TEXT_MAX_LENGTH = 500;

const expenseBaseSchema = z.object({
  merchant: z
    .string()
    .trim()
    .min(1, 'El comercio es obligatorio')
    .max(200, 'El comercio no puede superar los 200 caracteres'),

  expenseDate: z
    .string()
    .min(1, 'La fecha del gasto es obligatoria'),

  categoryId: z.string(),

  currency: currencyEnum,

  amountDecimal: z
    .string()
    .min(1, 'El importe es obligatorio'),

  taxRateBps: z
    .number({
      invalid_type_error: 'El tipo impositivo es obligatorio',
    })
    .int('El tipo impositivo debe ser un número entero de puntos básicos')
    .min(0, 'El tipo impositivo no puede ser negativo')
    .max(
      MAX_TAX_RATE_BPS,
      'El tipo impositivo no puede superar el 100%'
    ),

  taxIncluded: z.boolean(),
});

/** Formulario de gastos con validación adaptada a la moneda y a la categoría seleccionadas. Los campos personalizados se validan según la categoría y se descartan valores de categorías anteriores.
 */
export function makeExpenseSchema(fields: CategoryField[]) {
  const shape: z.ZodRawShape = Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.fieldType === 'BOOLEAN'
        ? z.boolean()
        : z.string(),
    ])
  );

  return expenseBaseSchema
    .extend({
      customFields: z.object(shape),
    })
    .superRefine((values, ctx) => {
      if (
        values.amountDecimal &&
        !isValidDecimalString(
          values.amountDecimal,
          values.currency
        )
      ) {
        const digits =
          CURRENCY_MINOR_UNITS[values.currency];

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amountDecimal'],
          message:
            digits === 0
              ? `${values.currency} no utiliza decimales`
              : `Introduce un importe positivo con un máximo de ${digits} decimales para ${values.currency}`,
        });
      }

      for (const field of fields) {
        const value =
          values.customFields[field.id];

        if (typeof value !== 'string') continue;

        const path = [
          'customFields',
          field.id,
        ];

        const trimmed = value.trim();

        if (!trimmed) {
          if (field.required) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path,
              message: `${field.name} es obligatorio`,
            });
          }

          continue;
        }

        if (
          field.fieldType === 'NUMBER' &&
          !CUSTOM_NUMBER_PATTERN.test(trimmed)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `${field.name} debe ser un número con un máximo de 4 decimales`,
          });
        }

        if (
          field.fieldType === 'TEXT' &&
          trimmed.length >
            CUSTOM_TEXT_MAX_LENGTH
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: `${field.name} no puede superar los ${CUSTOM_TEXT_MAX_LENGTH} caracteres`,
          });
        }
      }
    });
}

export type ExpenseFormValues = z.infer<
  ReturnType<typeof makeExpenseSchema>
>;

/** El `id` está vacío en los campos nuevos y se elimina antes de enviarlos a la API. */
export const categoryFieldSchema = z.object({
  id: z.string(),

  name: z
    .string()
    .trim()
    .min(1, 'El nombre del campo es obligatorio')
    .max(
      100,
      'El nombre del campo no puede superar los 100 caracteres'
    ),

  fieldType: z.enum([
    'TEXT',
    'NUMBER',
    'BOOLEAN',
  ]),

  required: z.boolean(),

  active: z.boolean(),
});

export const categorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio')
      .max(
        32,
        'El código no puede superar los 32 caracteres'
      )
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Utiliza únicamente letras, números, guiones o guiones bajos'
      ),

    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(
        100,
        'El nombre no puede superar los 100 caracteres'
      ),

    active: z.boolean(),

    customFields: z.array(
      categoryFieldSchema
    ),
  })
  .superRefine((values, ctx) => {
    const firstSeenAt = new Map<
      string,
      number
    >();

    values.customFields.forEach(
      (field, index) => {
        const key = field.name
          .trim()
          .toLowerCase();

        if (!key) return;

        if (firstSeenAt.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              'customFields',
              index,
              'name',
            ],
            message:
              'Los nombres de los campos deben ser únicos dentro de una categoría',
          });
        } else {
          firstSeenAt.set(key, index);
        }
      }
    );
  });

export type CategoryFormValues =
  z.infer<typeof categorySchema>;

export const warningRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(
        120,
        'El nombre no puede superar los 120 caracteres'
      ),

    categoryId: z.string(),

    currency: currencyEnum,

    thresholdDecimal: z
      .string()
      .min(1, 'El límite es obligatorio'),

    severity: z.enum([
      'INFO',
      'WARNING',
      'BLOCKING',
    ]),

    message: z
      .string()
      .trim()
      .min(1, 'El mensaje es obligatorio')
      .max(
        255,
        'El mensaje no puede superar los 255 caracteres'
      ),

    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.thresholdDecimal) return;

    if (
      !isValidDecimalString(
        values.thresholdDecimal,
        values.currency
      )
    ) {
      const digits =
        CURRENCY_MINOR_UNITS[values.currency];

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdDecimal'],
        message:
          digits === 0
            ? `${values.currency} no utiliza decimales`
            : `Introduce un límite con un máximo de ${digits} decimales para ${values.currency}`,
      });
    }
  });

export type WarningRuleFormValues =
  z.infer<typeof warningRuleSchema>;

export const orgAttributeSchema = z.object({
  dimension: z.enum([
    'LOCATION',
    'DEPARTMENT',
    'POSITION',
  ]),

  code: z
    .string()
    .trim()
    .min(1, 'El código es obligatorio')
    .max(
      32,
      'El código no puede superar los 32 caracteres'
    )
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Utiliza únicamente letras, números, guiones o guiones bajos'
    ),

  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(
      100,
      'El nombre no puede superar los 100 caracteres'
    ),

  active: z.boolean(),
});

export type OrgAttributeFormValues =
  z.infer<typeof orgAttributeSchema>;

/** Las opciones vacías representan "Cualquiera" y se envían como `null` a la API. */
export const approvalRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(
        120,
        'El nombre no puede superar los 120 caracteres'
      ),

    priority: z
      .number({
        invalid_type_error:
          'La prioridad es obligatoria',
      })
      .int(
        'La prioridad debe ser un número entero'
      )
      .min(
        0,
        'La prioridad no puede ser negativa'
      )
      .max(
        10000,
        'La prioridad no puede superar 10000'
      ),

    categoryId: z.string(),

    currency: currencyEnum,

    thresholdDecimal: z
      .string()
      .min(1, 'El límite es obligatorio'),

    submitterLocationId: z.string(),

    submitterDepartmentId: z.string(),

    submitterPositionId: z.string(),

    approverRole: z.union([
      z.enum(['APPROVER', 'ADMIN']),
      z.literal(''),
    ]),

    approverLocationId: z.string(),

    approverDepartmentId: z.string(),

    approverPositionId: z.string(),

    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.thresholdDecimal) return;

    if (
      !isValidDecimalString(
        values.thresholdDecimal,
        values.currency
      )
    ) {
      const digits =
        CURRENCY_MINOR_UNITS[values.currency];

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdDecimal'],
        message:
          digits === 0
            ? `${values.currency} no utiliza decimales`
            : `Introduce un límite con un máximo de ${digits} decimales para ${values.currency}`,
      });
    }
  });

export type ApprovalRuleFormValues =
  z.infer<typeof approvalRuleSchema>;

/** Django rechaza por defecto las contraseñas con menos de 8 caracteres. */
const passwordField = z
  .string()
  .min(
    8,
    'La contraseña debe tener al menos 8 caracteres'
  )
  .max(
    128,
    'La contraseña no puede superar los 128 caracteres'
  );

export const userCreateSchema = z.object({
  email: z
    .string()
    .trim()
    .min(
      1,
      'El correo electrónico es obligatorio'
    )
    .email(
      'Introduce un correo electrónico válido'
    ),

  fullName: z
    .string()
    .trim()
    .min(
      1,
      'El nombre completo es obligatorio'
    )
    .max(
      255,
      'El nombre completo no puede superar los 255 caracteres'
    ),

  role: z.enum([
    'EMPLOYEE',
    'APPROVER',
    'ADMIN',
  ]),

  active: z.boolean(),

  password: passwordField,

  locationId: z.string(),

  departmentId: z.string(),

  positionId: z.string(),
});

export type UserCreateFormValues =
  z.infer<typeof userCreateSchema>;

export const setPasswordSchema = z.object({
  password: passwordField,
});

export type SetPasswordFormValues =
  z.infer<typeof setPasswordSchema>;

/** El backend requiere un comentario no vacío al rechazar. */
export const rejectSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(
      1,
      'Es obligatorio añadir un comentario al rechazar un informe'
    )
    .max(
      2000,
      'El comentario no puede superar los 2000 caracteres'
    ),
});

export type RejectFormValues =
  z.infer<typeof rejectSchema>;

export const commentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(
      1,
      'El comentario no puede estar vacío'
    )
    .max(
      2000,
      'El comentario no puede superar los 2000 caracteres'
    ),
});

export type CommentFormValues =
  z.infer<typeof commentSchema>;

export const approvalStepSchema = z.object({
  approverId: z
    .string()
    .min(
      1,
      'Selecciona un aprobador'
    ),

  stepOrder: z
    .number({
      invalid_type_error:
        'El orden del paso es obligatorio',
    })
    .int(
      'El orden del paso debe ser un número entero'
    )
    .min(
      1,
      'El orden de los pasos comienza en 1'
    ),
});

export type ApprovalStepFormValues =
  z.infer<typeof approvalStepSchema>;

export const delegateSchema = z.object({
  approverId: z
    .string()
    .min(
      1,
      'Selecciona un aprobador'
    ),

  comment: z
    .string()
    .trim()
    .max(
      2000,
      'El comentario no puede superar los 2000 caracteres'
    ),
});

export type DelegateFormValues =
  z.infer<typeof delegateSchema>;