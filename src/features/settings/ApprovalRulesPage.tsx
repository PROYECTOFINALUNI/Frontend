import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Checkbox, Input, Select } from '@/shared/components/Field';
import { Modal } from '@/shared/components/Modal';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { PageHeader } from '@/shared/components/PageHeader';
import { AlertBanner, EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { extractFormErrors, toMessage } from '@/shared/api/errors';
import {
  SUPPORTED_CURRENCIES,
  decimalToMinor,
  formatDisplay,
  minorToDecimal,
  type CurrencyCode,
} from '@/shared/money/money';
import { approvalRuleSchema, type ApprovalRuleFormValues } from '@/shared/validation/schemas';
import type { ApprovalRule, ApprovalRuleWrite, OrgAttribute } from '@/shared/types/domain';

import {
  useApprovalRules,
  useCategories,
  useCreateApprovalRule,
  useDeleteApprovalRule,
  useOrgAttributes,
  useUpdateApprovalRule,
} from '@/features/catalog/api';

const ANY = 'Any';

function useOrgCatalog() {
  const locations = useOrgAttributes({ dimension: 'LOCATION' });
  const departments = useOrgAttributes({ dimension: 'DEPARTMENT' });
  const positions = useOrgAttributes({ dimension: 'POSITION' });
  return { locations, departments, positions };
}

/** Renders the matched values of a criteria triple as "Spain · IT · Any". */
function CriteriaSummary({
  values,
  lookup,
}: {
  values: Array<string | null>;
  lookup: (id: string | null) => string;
}) {
  return <span className="text-slate-600">{values.map((value) => lookup(value)).join(' · ')}</span>;
}

export function ApprovalRulesPage() {
  const query = useApprovalRules();
  const categoriesQuery = useCategories();
  const { locations, departments, positions } = useOrgCatalog();
  const createRule = useCreateApprovalRule();
  const updateRule = useUpdateApprovalRule();
  const deleteRule = useDeleteApprovalRule();

  const [editing, setEditing] = useState<ApprovalRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApprovalRule | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const allAttributes: OrgAttribute[] = [
    ...(locations.data ?? []),
    ...(departments.data ?? []),
    ...(positions.data ?? []),
  ];

  const attributeName = (id: string | null) =>
    id ? (allAttributes.find((attribute) => attribute.id === id)?.name ?? 'Unknown') : ANY;

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
        title="Approval rules"
        description="Rules decide who reviews a report. Every rule matched by an expense adds one step, in priority order."
        breadcrumb={[{ label: 'Settings' }, { label: 'Approval rules' }]}
        actions={<Button onClick={() => setIsCreating(true)}>New rule</Button>}
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">{actionError}</AlertBanner>
        </div>
      )}

      <div className="mb-4">
        <AlertBanner tone="info">
          A rule fires when an expense is strictly above its threshold in the matching currency and
          category, and the submitter matches its attributes. Its approver criteria resolve to a
          pool, and any one of those people can approve or reject the step. If no rule matches, or
          the matching rules resolve to nobody, the report is{' '}
          <strong>approved automatically</strong> on submit.
        </AlertBanner>
      </div>

      <Card>
        {query.isPending && <TableSkeleton columns={6} />}
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && query.data.length === 0 && (
          <EmptyState
            title="No approval rules yet"
            description="Without any rules every report is approved as soon as it is submitted. Add a rule to route reports to the right reviewers."
            action={<Button onClick={() => setIsCreating(true)}>New rule</Button>}
          />
        )}

        {query.isSuccess && query.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">Approval rules</caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Expense matches
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Submitter
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Approvers
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
                    <td className="tabular px-4 py-2 text-right text-slate-600">{rule.priority}</td>
                    <th scope="row" className="px-4 py-2 text-left font-medium text-slate-900">
                      {rule.name}
                    </th>
                    <td className="px-4 py-2 text-slate-600">
                      {categoryName(rule.categoryId)}
                      <span className="block text-xs whitespace-nowrap">
                        above {formatDisplay(rule.thresholdMinor, rule.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <CriteriaSummary
                        values={[
                          rule.submitterLocationId,
                          rule.submitterDepartmentId,
                          rule.submitterPositionId,
                        ]}
                        lookup={attributeName}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <CriteriaSummary
                        values={[
                          rule.approverLocationId,
                          rule.approverDepartmentId,
                          rule.approverPositionId,
                        ]}
                        lookup={attributeName}
                      />
                      <span className="block text-xs">
                        {rule.approverRole
                          ? `${rule.approverRole.charAt(0)}${rule.approverRole.slice(1).toLowerCase()} · `
                          : ''}
                        {rule.approverPoolSize === 0 ? (
                          <span className="font-medium text-amber-700">
                            No matching approver — this rule is skipped
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {rule.approverPoolSize} matching{' '}
                            {rule.approverPoolSize === 1 ? 'person' : 'people'}
                          </span>
                        )}
                      </span>
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

      <ApprovalRuleDialog
        open={isCreating}
        title="New approval rule"
        onClose={() => setIsCreating(false)}
        onSubmit={async (values) => {
          await createRule.mutateAsync(values);
          setIsCreating(false);
        }}
      />

      <ApprovalRuleDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Edit approval rule"
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
        title="Delete this approval rule?"
        description={
          pendingDelete
            ? `${pendingDelete.name}. Steps already created on submitted reports keep their approvers.`
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

function AttributeSelect({
  label,
  hint,
  error,
  options,
  registration,
}: {
  label: string;
  hint?: string;
  error?: string;
  options: OrgAttribute[];
  registration: ReturnType<ReturnType<typeof useForm<ApprovalRuleFormValues>>['register']>;
}) {
  return (
    <Select label={label} hint={hint} error={error} {...registration}>
      <option value="">{ANY}</option>
      {options.map((attribute) => (
        <option key={attribute.id} value={attribute.id}>
          {attribute.name}
        </option>
      ))}
    </Select>
  );
}

function ApprovalRuleDialog({
  open,
  title,
  rule,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  rule?: ApprovalRule;
  onClose: () => void;
  onSubmit: (values: ApprovalRuleWrite) => Promise<void>;
}) {
  const categoriesQuery = useCategories();
  const { locations, departments, positions } = useOrgCatalog();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApprovalRuleFormValues>({
    resolver: zodResolver(approvalRuleSchema),
    defaultValues: {
      name: rule?.name ?? '',
      priority: rule?.priority ?? 100,
      categoryId: rule?.categoryId ?? '',
      currency: (rule?.currency ?? 'EUR') as CurrencyCode,
      thresholdDecimal: rule ? minorToDecimal(rule.thresholdMinor, rule.currency) : '0',
      submitterLocationId: rule?.submitterLocationId ?? '',
      submitterDepartmentId: rule?.submitterDepartmentId ?? '',
      submitterPositionId: rule?.submitterPositionId ?? '',
      approverRole: rule?.approverRole ?? '',
      approverLocationId: rule?.approverLocationId ?? '',
      approverDepartmentId: rule?.approverDepartmentId ?? '',
      approverPositionId: rule?.approverPositionId ?? '',
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
              active: formValues.active,
              priority: formValues.priority,
              categoryId: formValues.categoryId || null,
              currency: formValues.currency,
              thresholdMinor: decimalToMinor(
                formValues.thresholdDecimal,
                formValues.currency
              ).toString(),
              submitterLocationId: formValues.submitterLocationId || null,
              submitterDepartmentId: formValues.submitterDepartmentId || null,
              submitterPositionId: formValues.submitterPositionId || null,
              approverRole: formValues.approverRole || null,
              approverLocationId: formValues.approverLocationId || null,
              approverDepartmentId: formValues.approverDepartmentId || null,
              approverPositionId: formValues.approverPositionId || null,
            });
            reset();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            const mapping: Record<string, keyof ApprovalRuleFormValues> = {
              name: 'name',
              priority: 'priority',
              categoryId: 'categoryId',
              currency: 'currency',
              thresholdMinor: 'thresholdDecimal',
              submitterLocationId: 'submitterLocationId',
              submitterDepartmentId: 'submitterDepartmentId',
              submitterPositionId: 'submitterPositionId',
              approverRole: 'approverRole',
              approverLocationId: 'approverLocationId',
              approverDepartmentId: 'approverDepartmentId',
              approverPositionId: 'approverPositionId',
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
        className="space-y-6"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <div className="space-y-4">
          <Input
            label="Rule name"
            required
            autoFocus
            placeholder="e.g. Spanish IT expenses need a manager"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Priority"
            type="number"
            required
            min={0}
            hint="Lower runs earlier. When several rules match, they stack into a chain in this order."
            error={errors.priority?.message}
            {...register('priority', { valueAsNumber: true })}
          />
        </div>

        <fieldset className="space-y-4 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Expense matches</legend>

          <Select
            label="Category"
            hint="Leave as all categories to match any expense."
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
              hint="Fires when the amount is strictly greater. Use 0 to match any expense."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Submitter matches</legend>
          <p className="text-xs text-slate-500">
            Leave a field on {ANY} to ignore it when matching the person who submitted the report.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <AttributeSelect
              label="Location"
              options={locations.data ?? []}
              error={errors.submitterLocationId?.message}
              registration={register('submitterLocationId')}
            />
            <AttributeSelect
              label="Department"
              options={departments.data ?? []}
              error={errors.submitterDepartmentId?.message}
              registration={register('submitterDepartmentId')}
            />
            <AttributeSelect
              label="Position"
              options={positions.data ?? []}
              error={errors.submitterPositionId?.message}
              registration={register('submitterPositionId')}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Approver pool</legend>
          <p className="text-xs text-slate-500">
            Everyone matching these criteria can decide the step. The report owner is always
            excluded, and only active approvers and admins are eligible.
          </p>

          <Select
            label="Role"
            hint={`${ANY} covers both approvers and admins.`}
            error={errors.approverRole?.message}
            {...register('approverRole')}
          >
            <option value="">{ANY}</option>
            <option value="APPROVER">Approver</option>
            <option value="ADMIN">Admin</option>
          </Select>

          <div className="grid gap-4 sm:grid-cols-3">
            <AttributeSelect
              label="Location"
              options={locations.data ?? []}
              error={errors.approverLocationId?.message}
              registration={register('approverLocationId')}
            />
            <AttributeSelect
              label="Department"
              options={departments.data ?? []}
              error={errors.approverDepartmentId?.message}
              registration={register('approverDepartmentId')}
            />
            <AttributeSelect
              label="Position"
              options={positions.data ?? []}
              error={errors.approverPositionId?.message}
              registration={register('approverPositionId')}
            />
          </div>
        </fieldset>

        <Checkbox
          label="Active"
          hint="Inactive rules are ignored when a report is submitted."
          {...register('active')}
        />

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
