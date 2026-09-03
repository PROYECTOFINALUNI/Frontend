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
import { SeverityBadge } from '@/shared/components/Badges';
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
  warningRuleSchema,
  type WarningRuleFormValues,
} from '@/shared/validation/schemas';

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

  const createRule =
    useCreateWarningRule();

  const updateRule =
    useUpdateWarningRule();

  const deleteRule =
    useDeleteWarningRule();

  const [editing, setEditing] =
    useState<WarningRule | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<WarningRule | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

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
        title="Reglas de aviso"
        description="Define avisos que se activan cuando un gasto supera un importe determinado para una categoría y moneda concretas."
        breadcrumb={[
          {
            label: 'Ajustes',
          },
          {
            label: 'Reglas de aviso',
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

      <div className="mb-4">
        <AlertBanner tone="info">
          Los límites se comparan con el
          importe introducido, no con el
          total. Cuando el impuesto está
          incluido se utiliza el importe
          bruto; cuando no está incluido se
          utiliza el importe neto. Una regla{' '}
          <strong>bloqueante</strong>{' '}
          impide enviar el informe.
        </AlertBanner>
      </div>

      {/* Listado de reglas */}
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
              title="Aún no hay reglas de aviso"
              description="Crea una regla para detectar gastos que superen determinados importes, por ejemplo gastos de hotel superiores a 500,00 EUR."
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
                  Reglas de aviso
                </caption>

                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#fbfbfc]">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Nombre
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Categoría
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Límite
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Nivel
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
                        <th
                          scope="row"
                          className="px-5 py-4 text-left font-normal"
                        >
                          <span className="font-semibold text-[#202632]">
                            {rule.name}
                          </span>

                          <span className="mt-0.5 block text-xs text-[#8b95a5]">
                            {rule.message}
                          </span>
                        </th>

                        <td className="px-4 py-4 text-[#697386]">
                          {categoryName(
                            rule.categoryId
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-[#202632]">
                          {formatDisplay(
                            rule.thresholdMinor,
                            rule.currency
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <SeverityBadge
                            severity={
                              rule.severity
                            }
                          />
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
      <WarningRuleDialog
        open={isCreating}
        title="Nueva regla de aviso"
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

      {/* Editar regla*/}
      <WarningRuleDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Editar regla de aviso"
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

      {/* Eliminar reglas */}
      <Modal
        open={pendingDelete !== null}
        onClose={() =>
          setPendingDelete(null)
        }
        title="¿Eliminar esta regla de aviso?"
        description={
          pendingDelete
            ? `${pendingDelete.name}. Los avisos que ya se hayan registrado en gastos se conservarán.`
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
    severity:
    | 'INFO'
    | 'WARNING'
    | 'BLOCKING';
    message: string;
    active: boolean;
  }) => Promise<void>;
}) {
  const categoriesQuery =
    useCategories();

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
  } = useForm<WarningRuleFormValues>({
    resolver: zodResolver(
      warningRuleSchema
    ),
    defaultValues: {
      name: rule?.name ?? '',
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
        : '',
      severity:
        rule?.severity ?? 'WARNING',
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
                severity:
                  formValues.severity,
                message:
                  formValues.message,
                active:
                  formValues.active,
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
                keyof WarningRuleFormValues
              > = {
                name: 'name',
                categoryId:
                  'categoryId',
                currency: 'currency',
                thresholdMinor:
                  'thresholdDecimal',
                severity: 'severity',
                message: 'message',
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
        className="space-y-4"
      >
        {formError && (
          <AlertBanner tone="error">
            {formError}
          </AlertBanner>
        )}

        <Input
          label="Nombre de la regla"
          required
          autoFocus
          placeholder="Ej. Gasto elevado en hotel"
          error={errors.name?.message}
          {...register('name')}
        />

        <Select
          label="Categoría"
          hint="Déjalo vacío para aplicar la regla a todas las categorías."
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
            hint="La regla se activa cuando el importe es estrictamente superior."
          />
        </div>

        <Select
          label="Nivel del aviso"
          required
          hint="Una regla bloqueante impide enviar el informe."
          error={
            errors.severity?.message
          }
          {...register('severity')}
        >
          <option value="INFO">
            Información — solo informativa
          </option>

          <option value="WARNING">
            Aviso — requiere revisión
          </option>

          <option value="BLOCKING">
            Bloqueante — impide el envío
          </option>
        </Select>

        <Input
          label="Mensaje"
          required
          placeholder="El gasto de hotel supera el importe recomendado."
          hint="Se muestra al usuario y se guarda junto al gasto cuando se activa la regla."
          error={errors.message?.message}
          {...register('message')}
        />

        <Checkbox
          label="Activa"
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