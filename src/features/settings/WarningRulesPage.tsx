import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Checkbox, Input, Select } from '@/shared/components/Field';
import { Modal } from '@/shared/components/Modal';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { PageHeader } from '@/shared/components/PageHeader';
import { SeverityBadge } from '@/shared/components/Badges';
import { AlertBanner, EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { extractFormErrors, toMessage } from '@/shared/api/errors';
import {
  SUPPORTED_CURRENCIES,
  decimalToMinor,
  formatDisplay,
  minorToDecimal,
  type CurrencyCode,
} from '@/shared/money/money';
import { warningRuleSchema, type WarningRuleFormValues } from '@/shared/validation/schemas';
import type { WarningRule } from '@/shared/types/domain';

import {
  useCategories,
  useCreateWarningRule,
  useDeleteWarningRule,
  useUpdateWarningRule,
  useWarningRules,
} from '@/features/catalog/api';

export function WarningRulesPage() {
  const query = useWarningRules();
  const categoriesQuery = useCategories();
  const createRule = useCreateWarningRule();
  const updateRule = useUpdateWarningRule();
  const deleteRule = useDeleteWarningRule();

  const [editing, setEditing] = useState<WarningRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WarningRule | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categoryName = (categoryId: string | null) =>
    categoryId
      ? (categoriesQuery.data?.find((category) => category.id === categoryId)?.name ?? 'Unknown')
      : 'All categories';

  async function handleDelete() {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteRule.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setActionError(toMessage(error));
      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Warning rules"
        description="A rule fires when an expense amount is strictly greater than its threshold, in the same currency, for a matching category."
        breadcrumb={[{ label: 'Settings' }, { label: 'Warning rules' }]}
        actions={<Button onClick={() => setIsCreating(true)}>New rule</Button>}
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">{actionError}</AlertBanner>
        </div>
      )}

      <div className="mb-4">
        <AlertBanner tone="info">
          Thresholds compare against the amount that was entered, not the total. When tax is
          included that is the gross figure; when excluded it is the net figure. A{' '}
          <strong>Blocking</strong> rule prevents the whole report from being submitted.
        </AlertBanner>
      </div>

      <Card>
        {query.isPending && <TableSkeleton columns={6} />}
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && query.data.length === 0 && (
          <EmptyState
            title="No warning rules yet"
            description="Create a rule to flag unusually large expenses, for example hotels above 500.00 EUR."
            action={<Button onClick={() => setIsCreating(true)}>New rule</Button>}
          />
        )}

        {query.isSuccess && query.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">Warning rules</caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                    Threshold
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Active
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      <span className="font-medium text-slate-900">{rule.name}</span>
                      <span className="block text-xs text-slate-500">{rule.message}</span>
                    </th>
                    <td className="px-4 py-2 text-slate-600">{categoryName(rule.categoryId)}</td>
                    <td className="tabular px-4 py-2 text-right whitespace-nowrap">
                      {formatDisplay(rule.thresholdMinor, rule.currency)}
                    </td>
                    <td className="px-4 py-2">
                      <SeverityBadge severity={rule.severity} />
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      <span aria-hidden="true">{rule.active ? '✓' : '–'}</span>
                      <span className="sr-only">{rule.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(rule)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPendingDelete(rule)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <WarningRuleDialog
        open={isCreating}
        title="New warning rule"
        onClose={() => setIsCreating(false)}
        onSubmit={async (values) => {
          await createRule.mutateAsync(values);
          setIsCreating(false);
        }}
      />

      <WarningRuleDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Edit warning rule"
        rule={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return;
          await updateRule.mutateAsync({ id: editing.id, ...values });
          setEditing(null);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this warning rule?"
        description={
          pendingDelete
            ? `${pendingDelete.name}. Warnings already recorded on expenses are kept as snapshots.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDelete()}
              isLoading={deleteRule.isPending}
            >
              Delete rule
            </Button>
          </>
        }
      />
    </>
  );
}

function WarningRuleDialog({
  open,
  title,
  rule,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  rule?: WarningRule;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    categoryId: string | null;
    currency: CurrencyCode;
    thresholdMinor: string;
    severity: 'INFO' | 'WARNING' | 'BLOCKING';
    message: string;
    active: boolean;
  }) => Promise<void>;
}) {
  const categoriesQuery = useCategories();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WarningRuleFormValues>({
    resolver: zodResolver(warningRuleSchema),
    defaultValues: {
      name: rule?.name ?? '',
      categoryId: rule?.categoryId ?? '',
      currency: (rule?.currency ?? 'EUR') as CurrencyCode,
      thresholdDecimal: rule ? minorToDecimal(rule.thresholdMinor, rule.currency) : '',
      severity: rule?.severity ?? 'WARNING',
      message: rule?.message ?? '',
      active: rule?.active ?? true,
    },
  });

  const values = watch();

  function close() {
    setFormError(null);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={title}>
      <form
        onSubmit={handleSubmit(async (formValues) => {
          setFormError(null);
          try {
            await onSubmit({
              name: formValues.name,
              categoryId: formValues.categoryId || null,
              currency: formValues.currency,
              thresholdMinor: decimalToMinor(
                formValues.thresholdDecimal,
                formValues.currency
              ).toString(),
              severity: formValues.severity,
              message: formValues.message,
              active: formValues.active,
            });
            reset();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            const mapping: Record<string, keyof WarningRuleFormValues> = {
              name: 'name',
              categoryId: 'categoryId',
              currency: 'currency',
              thresholdMinor: 'thresholdDecimal',
              severity: 'severity',
              message: 'message',
              active: 'active',
            };
            for (const [path, fieldMessage] of Object.entries(fieldErrors)) {
              const field = mapping[path];
              if (field) setError(field, { type: 'server', message: fieldMessage });
            }
            setFormError(message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <Input
          label="Rule name"
          required
          autoFocus
          placeholder="e.g. High hotel expense"
          error={errors.name?.message}
          {...register('name')}
        />

        <Select
          label="Category"
          hint="Leave empty to apply the rule to every category."
          error={errors.categoryId?.message}
          {...register('categoryId')}
        >
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Currency"
            required
            error={errors.currency?.message}
            {...register('currency')}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>

          <MoneyInput
            label="Threshold"
            required
            currency={values.currency}
            value={values.thresholdDecimal}
            onChange={(next) => setValue('thresholdDecimal', next, { shouldDirty: true })}
            error={errors.thresholdDecimal?.message}
            hint="Fires when the amount is strictly greater."
          />
        </div>

        <Select
          label="Severity"
          required
          hint="Blocking prevents the report from being submitted."
          error={errors.severity?.message}
          {...register('severity')}
        >
          <option value="INFO">Info — informational only</option>
          <option value="WARNING">Warning — reviewer should check</option>
          <option value="BLOCKING">Blocking — prevents submission</option>
        </Select>

        <Input
          label="Message"
          required
          placeholder="Hotel expense is above the recommended amount."
          hint="Shown to the user and copied onto the expense when the rule fires."
          error={errors.message?.message}
          {...register('message')}
        />

        <Checkbox label="Active" {...register('active')} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save rule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
