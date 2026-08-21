import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Checkbox, Input, Select } from '@/shared/components/Field';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { AlertBanner } from '@/shared/components/States';
import { extractFormErrors } from '@/shared/api/errors';
import {
  MAX_TAX_RATE_BPS,
  SUPPORTED_CURRENCIES,
  calculateTax,
  decimalToMinor,
  evaluateWarningsLocally,
  isValidDecimalString,
  type CurrencyCode,
} from '@/shared/money/money';
import { makeExpenseSchema, type ExpenseFormValues } from '@/shared/validation/schemas';
import { todayIso } from '@/shared/utils/dates';
import { useDebouncedValue } from '@/shared/utils/useDebouncedValue';
import { useCategories, useWarningRules } from '@/features/catalog/api';
import type {
  CategoryField,
  Expense,
  ExpenseCustomFieldWrite,
  ExpenseWrite,
} from '@/shared/types/domain';

import { useExpensePreview } from '../api';
import { CalculationPreview, type LocalCalculation } from './CalculationPreview';
import { ExpenseWarningsPanel, type DisplayWarning } from './ExpenseWarningsPanel';

/** Common European VAT rates, in basis points. */
const TAX_PRESETS = [
  { label: 'No tax (0%)', value: 0 },
  { label: 'Super-reduced (4%)', value: 400 },
  { label: 'Reduced (10%)', value: 1000 },
  { label: 'Standard (21%)', value: 2100 },
];

const CUSTOM_RATE = 'custom';

/** Indexing a record of errors widens `message` past `string`, so it is narrowed here. */
function customFieldError(errors: FieldErrors<ExpenseFormValues>, fieldId: string) {
  const message = errors.customFields?.[fieldId]?.message;
  return typeof message === 'string' ? message : undefined;
}

/** A blank answer clears the field; an unticked checkbox is a real `false`. */
function toCustomFieldWrite(
  field: CategoryField,
  values: ExpenseFormValues
): ExpenseCustomFieldWrite {
  const value = values.customFields[field.id];
  if (typeof value === 'boolean') return { fieldId: field.id, value };
  return { fieldId: field.id, value: value?.trim() || null };
}

export type ExpenseFormProps = {
  reportId: string;
  expense?: Expense;
  onSubmit: (payload: ExpenseWrite) => Promise<unknown>;
  onCancel: () => void;
  submitLabel: string;
};

export function ExpenseForm({
  reportId,
  expense,
  onSubmit,
  onCancel,
  submitLabel,
}: ExpenseFormProps) {
  const categoriesQuery = useCategories();
  const warningRulesQuery = useWarningRules();
  const [formError, setFormError] = useState<string | null>(null);

  const storedCustomValues = useMemo(
    () => new Map((expense?.customFields ?? []).map((stored) => [stored.fieldId, stored.value])),
    [expense]
  );

  const defaults: ExpenseFormValues = useMemo(
    () => ({
      merchant: expense?.merchant ?? '',
      expenseDate: expense?.expenseDate ?? todayIso(),
      categoryId: expense?.category?.id ?? '',
      currency: (expense?.amount.currency ?? 'EUR') as CurrencyCode,
      amountDecimal: expense?.amount.decimal ?? '',
      taxRateBps: expense?.tax.rateBps ?? 2100,
      taxIncluded: expense?.tax.included ?? false,
      customFields: Object.fromEntries(storedCustomValues),
    }),
    [expense, storedCustomValues]
  );

  const [categoryId, setCategoryId] = useState(defaults.categoryId);

  // Only the active fields are asked for. A value stored against a field that has since
  // been deactivated is left alone by the API and still shows on the expense.
  const customFields: CategoryField[] = useMemo(() => {
    const category = categoriesQuery.data?.find((item) => item.id === categoryId);
    return (category?.customFields ?? []).filter((field) => field.active);
  }, [categoriesQuery.data, categoryId]);

  const schema = useMemo(() => makeExpenseSchema(customFields), [customFields]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  const values = watch();

  // Inicializa los campos de la categoría seleccionada y descarta los valores de la categoría anterior.
  useEffect(() => {
    setValue(
      'customFields',
      Object.fromEntries(
        customFields.map((field) => {
          const stored = storedCustomValues.get(field.id);
          if (field.fieldType === 'BOOLEAN') return [field.id, stored === true];
          return [field.id, typeof stored === 'string' ? stored : ''];
        })
      ),
      { shouldValidate: false }
    );
  }, [customFields, storedCustomValues, setValue]);
  const [useCustomRate, setUseCustomRate] = useState(
    () => !TAX_PRESETS.some((preset) => preset.value === defaults.taxRateBps)
  );
  // Al cambiar a una moneda sin decimales, el importe introducido puede dejar de ser válido.
  useEffect(() => {
    if (values.amountDecimal && !isValidDecimalString(values.amountDecimal, values.currency)) {
      setError('amountDecimal', {
        type: 'currency',
        message: `This amount is not valid for ${values.currency}.`,
      });
    }
  }, [values.currency, values.amountDecimal, setError]);

  // Calcula una previsualización local inmediata utilizando la misma lógica de cálculo que el backend.
  const local: LocalCalculation | null = useMemo(() => {
    if (!values.amountDecimal || !isValidDecimalString(values.amountDecimal, values.currency)) {
      return null;
    }
    try {
      const amountMinor = decimalToMinor(values.amountDecimal, values.currency);
      const calculation = calculateTax(amountMinor, values.taxRateBps, values.taxIncluded);
      return { amountMinor, ...calculation };
    } catch {
      return null;
    }
  }, [values.amountDecimal, values.currency, values.taxRateBps, values.taxIncluded]);

  const localWarnings: DisplayWarning[] = useMemo(() => {
    if (!local || !warningRulesQuery.data) return [];
    return evaluateWarningsLocally(warningRulesQuery.data, {
      currency: values.currency,
      categoryId: values.categoryId || null,
      amountMinor: local.amountMinor,
    }).map((warning) => ({
      key: warning.ruleId,
      severity: warning.severity,
      message: warning.message,
    }));
  }, [local, warningRulesQuery.data, values.currency, values.categoryId]);

  // La previsualización del backend se retrasa ligeramente para evitar una petición por cada pulsación.
  const previewBody: ExpenseWrite | null = local
    ? {
        reportId,
        merchant: values.merchant.trim() || 'Preview',
        expenseDate: values.expenseDate || todayIso(),
        categoryId: values.categoryId || null,
        currency: values.currency,
        amountDecimal: values.amountDecimal,
        tax: { rateBps: values.taxRateBps, included: values.taxIncluded },
        // La previsualización solo calcula el gasto; los campos personalizados no afectan a avisos ni aprobaciones.
        customFields: [],
      }
    : null;

  const debouncedBody = useDebouncedValue(previewBody, 500);
  const previewQuery = useExpensePreview(debouncedBody, { enabled: debouncedBody !== null });

  const backendPreview = previewQuery.data ?? null;
  const backendWarnings: DisplayWarning[] = (backendPreview?.warnings ?? []).map(
    (warning, index) => ({
      key: `backend-${index}`,
      severity: warning.severity,
      message: warning.message,
    })
  );

  const shownWarnings = backendPreview ? backendWarnings : localWarnings;
  const blocking = shownWarnings.some((warning) => warning.severity === 'BLOCKING');

  async function submit(formValues: ExpenseFormValues) {
    setFormError(null);
    try {
      await onSubmit({
        reportId,
        merchant: formValues.merchant.trim(),
        expenseDate: formValues.expenseDate,
        // La API requiere enviar la categoría, usando null cuando no hay ninguna seleccionada.
        categoryId: formValues.categoryId || null,
        currency: formValues.currency,
        amountDecimal: formValues.amountDecimal,
        tax: { rateBps: formValues.taxRateBps, included: formValues.taxIncluded },
        customFields: customFields.map((field) => toCustomFieldWrite(field, formValues)),
      });
    } catch (error) {
      const { fieldErrors, formError: message } = extractFormErrors(error);
      // Adapta las rutas de la API en camelCase a los nombres de los campos del formulario.
      const mapping: Record<string, keyof ExpenseFormValues> = {
        merchant: 'merchant',
        expenseDate: 'expenseDate',
        categoryId: 'categoryId',
        currency: 'currency',
        amountDecimal: 'amountDecimal',
        'tax.rateBps': 'taxRateBps',
        'tax.included': 'taxIncluded',
      };

      for (const [path, fieldMessage] of Object.entries(fieldErrors)) {
        // El error de un campo personalizado ya incluye directamente el identificador de su campo.
        if (path.startsWith('customFields.')) {
          setError(path as `customFields.${string}`, { type: 'server', message: fieldMessage });
          continue;
        }
        const field = mapping[path];
        if (field) setError(field, { type: 'server', message: fieldMessage });
      }

      setFormError(message);
    }
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader title="Expense details" />
          <CardBody className="space-y-4">
            {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

            <Input
              label="Merchant"
              required
              autoFocus
              placeholder="e.g. Hotel Barcelona"
              error={errors.merchant?.message}
              {...register('merchant')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Expense date"
                type="date"
                required
                error={errors.expenseDate?.message}
                {...register('expenseDate')}
              />

              <Select
                label="Category"
                error={errors.categoryId?.message}
                hint={
                  categoriesQuery.isSuccess && categories.length === 0
                    ? 'No categories exist yet. An admin can create them under Settings.'
                    : 'Category scopes which warning rules apply.'
                }
                {...register('categoryId', {
                  onChange: (event: ChangeEvent<HTMLSelectElement>) =>
                    setCategoryId(event.target.value),
                })}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.code})
                  </option>
                ))}
              </Select>
            </div>

            {customFields.length > 0 && (
              <fieldset className="space-y-4 border-t border-slate-200 pt-4">
                <legend className="text-sm font-medium text-slate-800">
                  Details for this category
                </legend>
                {customFields.map((field) =>
                  field.fieldType === 'BOOLEAN' ? (
                    <Checkbox
                      key={field.id}
                      label={field.name}
                      {...register(`customFields.${field.id}`)}
                    />
                  ) : (
                    <Input
                      key={field.id}
                      label={field.name}
                      required={field.required}
                      type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                      step={field.fieldType === 'NUMBER' ? 'any' : undefined}
                      error={customFieldError(errors, field.id)}
                      {...register(`customFields.${field.id}`)}
                    />
                  )
                )}
              </fieldset>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Amount and tax"
            description="Amounts are kept as text and converted with integer arithmetic — never floating point."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Currency"
                required
                error={errors.currency?.message}
                {...register('currency')}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>

              <MoneyInput
                label="Amount"
                required
                currency={values.currency}
                value={values.amountDecimal}
                onChange={(next) =>
                  setValue('amountDecimal', next, { shouldValidate: false, shouldDirty: true })
                }
                error={errors.amountDecimal?.message}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800">Is tax included?</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="taxIncluded"
                    checked={!values.taxIncluded}
                    onChange={() => setValue('taxIncluded', false, { shouldDirty: true })}
                    className="text-brand-600 focus:ring-brand-600 size-4"
                  />
                  Excluded — the amount is net, tax is added on top
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="taxIncluded"
                    checked={values.taxIncluded}
                    onChange={() => setValue('taxIncluded', true, { shouldDirty: true })}
                    className="text-brand-600 focus:ring-brand-600 size-4"
                  />
                  Included — the amount is the receipt total
                </label>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Tax rate"
                value={useCustomRate ? CUSTOM_RATE : String(values.taxRateBps)}
                onChange={(event) => {
                  if (event.target.value === CUSTOM_RATE) {
                    setUseCustomRate(true);
                    return;
                  }
                  setUseCustomRate(false);
                  setValue('taxRateBps', Number(event.target.value), { shouldDirty: true });
                }}
              >
                {TAX_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                <option value={CUSTOM_RATE}>Custom rate…</option>
              </Select>

              {useCustomRate && (
                <Input
                  label="Custom rate (basis points)"
                  type="number"
                  min={0}
                  max={MAX_TAX_RATE_BPS}
                  step={1}
                  hint="2100 basis points = 21%."
                  error={errors.taxRateBps?.message}
                  {...register('taxRateBps', { valueAsNumber: true })}
                />
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="Calculation" headingLevel={3} />
          <CardBody className="space-y-4">
            <CalculationPreview
              local={local}
              backend={backendPreview}
              currency={values.currency}
              rateBps={values.taxRateBps}
              taxIncluded={values.taxIncluded}
              isFetchingBackend={previewQuery.isFetching}
            />

            {previewQuery.isError && (
              <AlertBanner tone="info">
                The server preview is unavailable, so the local estimate is shown instead. The
                official values are still calculated when you save.
              </AlertBanner>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Warnings" headingLevel={3} />
          <CardBody>
            <ExpenseWarningsPanel
              warnings={shownWarnings}
              isPreview
              emptyMessage="No warnings triggered by this amount."
            />
            {blocking && (
              <div className="mt-3">
                <AlertBanner tone="error" title="Blocking warning">
                  You can still save this expense, but the report cannot be submitted while a
                  blocking warning applies.
                </AlertBanner>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
