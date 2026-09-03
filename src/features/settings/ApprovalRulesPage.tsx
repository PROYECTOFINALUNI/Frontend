import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

import {
  Checkbox,
  Input,
  Select,
} from '@/shared/components/Field';

import { Modal } from '@/shared/components/Modal';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { PageHeader } from '@/shared/components/PageHeader';

import {
  AlertBanner,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/shared/components/States';

import {
  extractFormErrors,
  toMessage,
} from '@/shared/api/errors';

import {
  SUPPORTED_CURRENCIES,
  decimalToMinor,
  formatDisplay,
  minorToDecimal,
  type CurrencyCode,
} from '@/shared/money/money';

import {
  approvalRuleSchema,
  type ApprovalRuleFormValues,
} from '@/shared/validation/schemas';

import type {
  ApprovalRule,
  ApprovalRuleWrite,
  OrgAttribute,
} from '@/shared/types/domain';

import {
  useApprovalRules,
  useCategories,
  useCreateApprovalRule,
  useDeleteApprovalRule,
  useOrgAttributes,
  useUpdateApprovalRule,
} from '@/features/catalog/api';

const ANY = 'Cualquiera';

function useOrgCatalog() {
  const locations = useOrgAttributes({
    dimension: 'LOCATION',
  });

  const departments = useOrgAttributes({
    dimension: 'DEPARTMENT',
  });

  const positions = useOrgAttributes({
    dimension: 'POSITION',
  });

  return {
    locations,
    departments,
    positions,
  };
}

/** Muestra los valores que coinciden con los criterios, por ejemplo "España · IT · Cualquiera" */
function CriteriaSummary({
  values,
  lookup,
}: {
  values: Array<string | null>;
  lookup: (id: string | null) => string;
}) {
  return (
    <span className="text-[#697386]">
      {values
        .map((value) => lookup(value))
        .join(' · ')}
    </span>
  );
}

export function ApprovalRulesPage() {
  const query = useApprovalRules();

  const categoriesQuery = useCategories();

  const {
    locations,
    departments,
    positions,
  } = useOrgCatalog();

  const createRule =
    useCreateApprovalRule();

  const updateRule =
    useUpdateApprovalRule();

  const deleteRule =
    useDeleteApprovalRule();

  const [editing, setEditing] =
    useState<ApprovalRule | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<ApprovalRule | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const allAttributes: OrgAttribute[] = [
    ...(locations.data ?? []),
    ...(departments.data ?? []),
    ...(positions.data ?? []),
  ];

  const attributeName = (
    id: string | null
  ) =>
    id
      ? (allAttributes.find(
        (attribute) =>
          attribute.id === id
      )?.name ?? 'Desconocido')
      : ANY;

  const categoryName = (
    categoryId: string | null
  ) =>
    categoryId
      ? (categoriesQuery.data?.find(
        (category) =>
          category.id === categoryId
      )?.name ?? 'Desconocida')
      : 'Todas las categorías';

  async function handleDelete() {
    if (!pendingDelete) return;

    setActionError(null);

    try {
      await deleteRule.mutateAsync(
        pendingDelete.id
      );

      setPendingDelete(null);
    } catch (error) {
      setActionError(toMessage(error));

      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reglas de aprobación"
        description="Las reglas determinan quién debe revisar un informe. Cada regla que coincide con un gasto añade un paso siguiendo el orden de prioridad."
        breadcrumb={[
          {
            label: 'Ajustes',
          },
          {
            label: 'Reglas de aprobación',
          },
        ]}
        actions={
          <Button
            onClick={() =>
              setIsCreating(true)
            }
          >
            <PlusIcon />
            Nueva regla
          </Button>
        }
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">
            {actionError}
          </AlertBanner>
        </div>
      )}

      {/* Info */}
      <div className="mb-4">
        <AlertBanner tone="info">
          Una regla se activa cuando un gasto
          supera estrictamente su límite en la
          moneda y categoría correspondientes,
          y el usuario que envía el informe
          coincide con sus criterios. Los
          criterios del aprobador determinan
          qué personas pueden aprobar o
          rechazar el paso. Si ninguna regla
          coincide, o las reglas no encuentran
          ningún aprobador, el informe se{' '}
          <strong>
            aprueba automáticamente
          </strong>{' '}
          al enviarse.
        </AlertBanner>
      </div>

      {/* lista de reglas */}
      <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {query.isPending && (
          <TableSkeleton columns={6} />
        )}

        {query.isError && (
          <ErrorState
            error={query.error}
            onRetry={() =>
              void query.refetch()
            }
          />
        )}

        {query.isSuccess &&
          query.data.length === 0 && (
            <EmptyState
              title="Aún no hay reglas de aprobación"
              description="Sin reglas, los informes se aprueban automáticamente al enviarse. Añade una regla para dirigirlos a los aprobadores correspondientes."
              action={
                <Button
                  onClick={() =>
                    setIsCreating(true)
                  }
                >
                  <PlusIcon />
                  Nueva regla
                </Button>
              }
            />
          )}

        {query.isSuccess &&
          query.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">
                  Reglas de aprobación
                </caption>

                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#fbfbfc]">
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Prioridad
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Nombre
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Condiciones del gasto
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Solicitante
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Aprobadores
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Estado
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/[0.05]">
                  {query.data.map(
                    (rule) => (
                      <tr
                        key={rule.id}
                        className="transition-colors hover:bg-[#fafafa]"
                      >
                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#f0efff] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#4f46e5]">
                            {rule.priority}
                          </span>
                        </td>

                        <th
                          scope="row"
                          className="px-4 py-4 text-left font-semibold text-[#202632]"
                        >
                          {rule.name}
                        </th>

                        <td className="px-4 py-4 text-[#697386]">
                          {categoryName(
                            rule.categoryId
                          )}

                          <span className="mt-1 block whitespace-nowrap text-xs text-[#8b95a5]">
                            superior a{' · '}
                            <span className="font-semibold text-[#5b50f6]">
                              {formatDisplay(
                                rule.thresholdMinor,
                                rule.currency
                              )}
                            </span>
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <CriteriaSummary
                            values={[
                              rule.submitterLocationId,
                              rule.submitterDepartmentId,
                              rule.submitterPositionId,
                            ]}
                            lookup={
                              attributeName
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <CriteriaSummary
                            values={[
                              rule.approverLocationId,
                              rule.approverDepartmentId,
                              rule.approverPositionId,
                            ]}
                            lookup={
                              attributeName
                            }
                          />

                          <span className="mt-0.5 block text-xs">
                            {rule.approverRole
                              ? `${rule.approverRole.charAt(
                                0
                              )}${rule.approverRole
                                .slice(1)
                                .toLowerCase()} · `
                              : ''}

                            {rule.approverPoolSize ===
                              0 ? (
                              <span className="font-medium text-amber-700">
                                No hay
                                aprobadores
                                coincidentes —
                                se omite esta
                                regla
                              </span>
                            ) : (
                              <span className="text-[#8b95a5]">
                                {
                                  rule.approverPoolSize
                                }{' '}
                                {rule.approverPoolSize ===
                                  1
                                  ? 'persona coincidente'
                                  : 'personas coincidentes'}
                              </span>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              rule.active
                                ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset'
                                : 'inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-2.5 py-1 text-xs font-semibold text-[#7c8798] ring-1 ring-black/[0.06] ring-inset'
                            }
                          >
                            <span
                              aria-hidden="true"
                            >
                              {rule.active
                                ? '✓'
                                : '–'}
                            </span>

                            {rule.active
                              ? 'Activa'
                              : 'Inactiva'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setEditing(
                                  rule
                                )
                              }
                            >
                              Editar
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setPendingDelete(
                                  rule
                                )
                              }
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Crear regla */}
      <ApprovalRuleDialog
        open={isCreating}
        title="Nueva regla de aprobación"
        onClose={() =>
          setIsCreating(false)
        }
        onSubmit={async (values) => {
          await createRule.mutateAsync(
            values
          );

          setIsCreating(false);
        }}
      />

      {/* Editar regla */}
      <ApprovalRuleDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Editar regla de aprobación"
        rule={editing ?? undefined}
        onClose={() =>
          setEditing(null)
        }
        onSubmit={async (values) => {
          if (!editing) return;

          await updateRule.mutateAsync({
            id: editing.id,
            ...values,
          });

          setEditing(null);
        }}
      />

      {/* Eliminar regla */}
      <Modal
        open={pendingDelete !== null}
        onClose={() =>
          setPendingDelete(null)
        }
        title="¿Eliminar esta regla de aprobación?"
        description={
          pendingDelete
            ? `${pendingDelete.name}. Los pasos ya creados en informes enviados conservarán sus aprobadores.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setPendingDelete(null)
              }
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={() =>
                void handleDelete()
              }
              isLoading={
                deleteRule.isPending
              }
            >
              Eliminar regla
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
  registration: ReturnType<
    ReturnType<
      typeof useForm<ApprovalRuleFormValues>
    >['register']
  >;
}) {
  return (
    <Select
      label={label}
      hint={hint}
      error={error}
      {...registration}
    >
      <option value="">
        {ANY}
      </option>

      {options.map((attribute) => (
        <option
          key={attribute.id}
          value={attribute.id}
        >
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
  onSubmit: (
    values: ApprovalRuleWrite
  ) => Promise<void>;
}) {
  const categoriesQuery =
    useCategories();

  const {
    locations,
    departments,
    positions,
  } = useOrgCatalog();

  const [formError, setFormError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ApprovalRuleFormValues>({
    resolver: zodResolver(
      approvalRuleSchema
    ),
    defaultValues: {
      name: rule?.name ?? '',
      priority:
        rule?.priority ?? 100,
      categoryId:
        rule?.categoryId ?? '',
      currency: (
        rule?.currency ?? 'EUR'
      ) as CurrencyCode,
      thresholdDecimal: rule
        ? minorToDecimal(
          rule.thresholdMinor,
          rule.currency
        )
        : '0',
      submitterLocationId:
        rule?.submitterLocationId ??
        '',
      submitterDepartmentId:
        rule?.submitterDepartmentId ??
        '',
      submitterPositionId:
        rule?.submitterPositionId ??
        '',
      approverRole:
        rule?.approverRole ?? '',
      approverLocationId:
        rule?.approverLocationId ?? '',
      approverDepartmentId:
        rule?.approverDepartmentId ??
        '',
      approverPositionId:
        rule?.approverPositionId ?? '',
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
    <Modal
      open={open}
      onClose={close}
      title={title}
    >
      <form
        onSubmit={handleSubmit(
          async (formValues) => {
            setFormError(null);

            try {
              await onSubmit({
                name: formValues.name,
                active:
                  formValues.active,
                priority:
                  formValues.priority,
                categoryId:
                  formValues.categoryId ||
                  null,
                currency:
                  formValues.currency,
                thresholdMinor:
                  decimalToMinor(
                    formValues.thresholdDecimal,
                    formValues.currency
                  ).toString(),
                submitterLocationId:
                  formValues.submitterLocationId ||
                  null,
                submitterDepartmentId:
                  formValues.submitterDepartmentId ||
                  null,
                submitterPositionId:
                  formValues.submitterPositionId ||
                  null,
                approverRole:
                  formValues.approverRole ||
                  null,
                approverLocationId:
                  formValues.approverLocationId ||
                  null,
                approverDepartmentId:
                  formValues.approverDepartmentId ||
                  null,
                approverPositionId:
                  formValues.approverPositionId ||
                  null,
              });

              reset();
            } catch (error) {
              const {
                fieldErrors,
                formError: message,
              } =
                extractFormErrors(error);

              const mapping: Record<
                string,
                keyof ApprovalRuleFormValues
              > = {
                name: 'name',
                priority: 'priority',
                categoryId:
                  'categoryId',
                currency: 'currency',
                thresholdMinor:
                  'thresholdDecimal',
                submitterLocationId:
                  'submitterLocationId',
                submitterDepartmentId:
                  'submitterDepartmentId',
                submitterPositionId:
                  'submitterPositionId',
                approverRole:
                  'approverRole',
                approverLocationId:
                  'approverLocationId',
                approverDepartmentId:
                  'approverDepartmentId',
                approverPositionId:
                  'approverPositionId',
                active: 'active',
              };

              for (const [
                path,
                fieldMessage,
              ] of Object.entries(
                fieldErrors
              )) {
                const field =
                  mapping[path];

                if (field) {
                  setError(field, {
                    type: 'server',
                    message:
                      fieldMessage,
                  });
                }
              }

              setFormError(message);
            }
          }
        )}
        noValidate
        className="space-y-6"
      >
        {formError && (
          <AlertBanner tone="error">
            {formError}
          </AlertBanner>
        )}

        {/* datos generales */}
        <div className="space-y-4">
          <Input
            label="Nombre de la regla"
            required
            autoFocus
            placeholder="Ej. Los gastos de IT en España requieren un responsable"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Prioridad"
            type="number"
            required
            min={0}
            hint="Los valores más bajos se ejecutan primero. Si coinciden varias reglas, se añaden a la cadena siguiendo este orden."
            error={
              errors.priority?.message
            }
            {...register('priority', {
              valueAsNumber: true,
            })}
          />
        </div>

        {/* condiciones del gasto */}
        <fieldset className="space-y-4 rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-4">
          <legend className="px-2 text-sm font-semibold text-[#202632]">
            Condiciones del gasto
          </legend>

          <Select
            label="Categoría"
            hint="Déjalo en todas las categorías para que pueda coincidir con cualquier gasto."
            error={
              errors.categoryId?.message
            }
            {...register('categoryId')}
          >
            <option value="">
              Todas las categorías
            </option>

            {(categoriesQuery.data ?? []).map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Moneda"
              required
              error={
                errors.currency?.message
              }
              {...register('currency')}
            >
              {SUPPORTED_CURRENCIES.map(
                (code) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {code}
                  </option>
                )
              )}
            </Select>

            <MoneyInput
              label="Importe límite"
              required
              currency={values.currency}
              value={
                values.thresholdDecimal
              }
              onChange={(next) =>
                setValue(
                  'thresholdDecimal',
                  next,
                  {
                    shouldDirty: true,
                  }
                )
              }
              error={
                errors.thresholdDecimal
                  ?.message
              }
              hint="Se activa cuando el importe es estrictamente superior. Usa 0 para que coincida con cualquier gasto."
            />
          </div>
        </fieldset>

        {/* condiciones del solicitante */}
        <fieldset className="space-y-4 rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-4">
          <legend className="px-2 text-sm font-semibold text-[#202632]">
            Condiciones del solicitante
          </legend>

          <p className="text-xs leading-5 text-[#8b95a5]">
            Deja un campo en {ANY} para
            ignorarlo al comprobar la
            persona que ha enviado el
            informe.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <AttributeSelect
              label="Ubicación"
              options={
                locations.data ?? []
              }
              error={
                errors
                  .submitterLocationId
                  ?.message
              }
              registration={register(
                'submitterLocationId'
              )}
            />

            <AttributeSelect
              label="Departamento"
              options={
                departments.data ?? []
              }
              error={
                errors
                  .submitterDepartmentId
                  ?.message
              }
              registration={register(
                'submitterDepartmentId'
              )}
            />

            <AttributeSelect
              label="Puesto"
              options={
                positions.data ?? []
              }
              error={
                errors
                  .submitterPositionId
                  ?.message
              }
              registration={register(
                'submitterPositionId'
              )}
            />
          </div>
        </fieldset>

        {/* Grupo de aprobadores */}
        <fieldset className="space-y-4 rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-4">
          <legend className="px-2 text-sm font-semibold text-[#202632]">
            Grupo de aprobadores
          </legend>

          <p className="text-xs leading-5 text-[#8b95a5]">
            Todas las personas que coincidan
            con estos criterios podrán
            decidir este paso. El propietario
            del informe queda siempre
            excluido y solo pueden participar
            aprobadores y administradores
            activos.
          </p>

          <Select
            label="Rol"
            hint={`${ANY} incluye tanto aprobadores como administradores.`}
            error={
              errors.approverRole?.message
            }
            {...register('approverRole')}
          >
            <option value="">
              {ANY}
            </option>

            <option value="APPROVER">
              Aprobador
            </option>

            <option value="ADMIN">
              Administrador
            </option>
          </Select>

          <div className="grid gap-4 sm:grid-cols-3">
            <AttributeSelect
              label="Ubicación"
              options={
                locations.data ?? []
              }
              error={
                errors
                  .approverLocationId
                  ?.message
              }
              registration={register(
                'approverLocationId'
              )}
            />

            <AttributeSelect
              label="Departamento"
              options={
                departments.data ?? []
              }
              error={
                errors
                  .approverDepartmentId
                  ?.message
              }
              registration={register(
                'approverDepartmentId'
              )}
            />

            <AttributeSelect
              label="Puesto"
              options={
                positions.data ?? []
              }
              error={
                errors
                  .approverPositionId
                  ?.message
              }
              registration={register(
                'approverPositionId'
              )}
            />
          </div>
        </fieldset>

        <Checkbox
          label="Activa"
          hint="Las reglas inactivas se ignoran cuando se envía un informe."
          {...register('active')}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            Guardar regla
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Icono para el botón
function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}