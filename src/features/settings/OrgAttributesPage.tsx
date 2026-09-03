import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

import {
  Checkbox,
  Input,
} from '@/shared/components/Field';

import { Modal } from '@/shared/components/Modal';
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
  orgAttributeSchema,
  type OrgAttributeFormValues,
} from '@/shared/validation/schemas';

import {
  ORG_DIMENSIONS,
  type OrgAttribute,
  type OrgDimension,
} from '@/shared/types/domain';

import {
  useCreateOrgAttribute,
  useDeleteOrgAttribute,
  useOrgAttributes,
  useUpdateOrgAttribute,
} from '@/features/catalog/api';


const DIMENSION_LABELS: Record<
  OrgDimension,
  string
> = {
  LOCATION: 'Ubicación',
  DEPARTMENT: 'Departamento',
  POSITION: 'Puesto',
};

const DIMENSION_NEW_LABELS: Record<
  OrgDimension,
  string
> = {
  LOCATION: 'Nueva ubicación',
  DEPARTMENT: 'Nuevo departamento',
  POSITION: 'Nuevo puesto',
};

const DIMENSION_EDIT_LABELS: Record<
  OrgDimension,
  string
> = {
  LOCATION: 'Editar ubicación',
  DEPARTMENT: 'Editar departamento',
  POSITION: 'Editar puesto',
};

const DIMENSION_EMPTY_LABELS: Record<
  OrgDimension,
  string
> = {
  LOCATION: 'Aún no hay ubicaciones',
  DEPARTMENT: 'Aún no hay departamentos',
  POSITION: 'Aún no hay puestos',
};

const DIMENSION_HINTS: Record<
  OrgDimension,
  string
> = {
  LOCATION:
    'Indica dónde se encuentra cada persona, con el nivel de detalle que necesites: España, Barcelona, EMEA.',
  DEPARTMENT:
    'El equipo o área a la que pertenece una persona: IT, Finanzas, Ventas.',
  POSITION:
    'El nivel de responsabilidad o puesto utilizado para seleccionar aprobadores: Analista, Responsable, Director.',
};

export function OrgAttributesPage() {
  const [dimension, setDimension] =
    useState<OrgDimension>('LOCATION');

  const query = useOrgAttributes({
    dimension,
  });

  const createAttribute =
    useCreateOrgAttribute();

  const updateAttribute =
    useUpdateOrgAttribute();

  const deleteAttribute =
    useDeleteOrgAttribute();

  const [editing, setEditing] =
    useState<OrgAttribute | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<OrgAttribute | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const label =
    DIMENSION_LABELS[dimension];

  async function handleDelete() {
    if (!pendingDelete) return;

    setActionError(null);

    try {
      await deleteAttribute.mutateAsync(
        pendingDelete.id
      );

      setPendingDelete(null);
    } catch (error) {
      // La API devuelve `org_attribute_in_use` cuando el atributo todavía está siendo utilizado por un usuario o una regla
      setActionError(toMessage(error));

      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Organización"
        description="Cada usuario tiene una ubicación, un departamento y un puesto. Las reglas de aprobación utilizan estos datos para determinar quién debe revisar un informe."
        breadcrumb={[
          {
            label: 'Ajustes',
          },
          {
            label: 'Organización',
          },
        ]}
        actions={
          <Button
            onClick={() =>
              setIsCreating(true)
            }
          >
            <PlusIcon />
            {DIMENSION_NEW_LABELS[
              dimension
            ]}
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

      <div
        className="mb-4 flex flex-wrap gap-2 rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-2"
        role="tablist"
        aria-label="Tipo de atributo de organización"
      >
        {ORG_DIMENSIONS.map((value) => (
          <Button
            key={value}
            role="tab"
            aria-selected={
              value === dimension
            }
            variant={
              value === dimension
                ? 'primary'
                : 'secondary'
            }
            size="sm"
            onClick={() => {
              setDimension(value);
              setActionError(null);
            }}
          >
            {DIMENSION_LABELS[value]}
          </Button>
        ))}
      </div>

      {/* Listado */}
      <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">

        {/* Información de la dimensión seleccionada */}
        <div className="border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
          <p className="text-sm font-semibold text-[#202632]">
            {label}
          </p>

          <p className="mt-1 text-sm leading-5 text-[#8b95a5]">
            {DIMENSION_HINTS[dimension]}
          </p>
        </div>

        {query.isPending && (
          <TableSkeleton columns={4} />
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
              title={
                DIMENSION_EMPTY_LABELS[
                dimension
                ]
              }
              description={
                DIMENSION_HINTS[dimension]
              }
              action={
                <Button
                  onClick={() =>
                    setIsCreating(true)
                  }
                >
                  <PlusIcon />
                  {
                    DIMENSION_NEW_LABELS[
                    dimension
                    ]
                  }
                </Button>
              }
            />
          )}

        {query.isSuccess &&
          query.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">
                  Valores de {label}
                </caption>

                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#fbfbfc]">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Código
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
                    (attribute) => (
                      <tr
                        key={attribute.id}
                        className="transition-colors hover:bg-[#fafafa]"
                      >
                        {/* Código */}
                        <th
                          scope="row"
                          className="px-5 py-4 text-left font-mono text-xs font-normal"
                        >
                          <span className="inline-flex rounded-md bg-[#f0efff] px-2 py-1 font-semibold text-[#4f46e5]">
                            {attribute.code}
                          </span>
                        </th>

                        {/* Nombre */}
                        <td className="px-4 py-4 font-semibold text-[#202632]">
                          {attribute.name}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-4">
                          <span
                            className={
                              attribute.active
                                ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset'
                                : 'inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-2.5 py-1 text-xs font-semibold text-[#7c8798] ring-1 ring-black/[0.06] ring-inset'
                            }
                          >
                            <span
                              aria-hidden="true"
                            >
                              {attribute.active
                                ? '✓'
                                : '–'}
                            </span>

                            {attribute.active
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setEditing(
                                  attribute
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
                                  attribute
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

      {/* crear valor */}
      <OrgAttributeDialog
        key={`create-${dimension}`}
        open={isCreating}
        title={
          DIMENSION_NEW_LABELS[
          dimension
          ]
        }
        dimension={dimension}
        onClose={() =>
          setIsCreating(false)
        }
        onSubmit={async (values) => {
          await createAttribute.mutateAsync(
            values
          );

          setIsCreating(false);
        }}
      />

      {/* editar valor */}
      <OrgAttributeDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title={
          DIMENSION_EDIT_LABELS[
          dimension
          ]
        }
        dimension={dimension}
        attribute={
          editing ?? undefined
        }
        onClose={() =>
          setEditing(null)
        }
        onSubmit={async ({
          code,
          name,
          active,
        }) => {
          if (!editing) return;

          await updateAttribute.mutateAsync({
            id: editing.id,
            code,
            name,
            active,
          });

          setEditing(null);
        }}
      />

      {/* Eliminar valor */}
      <Modal
        open={pendingDelete !== null}
        onClose={() =>
          setPendingDelete(null)
        }
        title="¿Eliminar este valor?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.code}). Los valores asignados a un usuario o utilizados por una regla de aprobación no se pueden eliminar; desactívalos en su lugar.`
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
                deleteAttribute.isPending
              }
            >
              Eliminar valor
            </Button>
          </>
        }
      />
    </>
  );
}

function OrgAttributeDialog({
  open,
  title,
  dimension,
  attribute,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  dimension: OrgDimension;
  attribute?: OrgAttribute;
  onClose: () => void;
  onSubmit: (
    values: OrgAttributeFormValues
  ) => Promise<void>;
}) {
  const [formError, setFormError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<OrgAttributeFormValues>({
    resolver: zodResolver(
      orgAttributeSchema
    ),
    defaultValues: {
      dimension:
        attribute?.dimension ??
        dimension,
      code: attribute?.code ?? '',
      name: attribute?.name ?? '',
      active:
        attribute?.active ?? true,
    },
  });

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
          async (values) => {
            setFormError(null);

            try {
              await onSubmit(values);

              reset();
            } catch (error) {
              const {
                fieldErrors,
                formError: message,
              } =
                extractFormErrors(error);

              for (const [
                field,
                fieldMessage,
              ] of Object.entries(
                fieldErrors
              )) {
                if (
                  field === 'code' ||
                  field === 'name' ||
                  field === 'active'
                ) {
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

        <input
          type="hidden"
          {...register('dimension')}
        />

        <Input
          label="Código"
          required
          autoFocus
          hint="Se guarda en mayúsculas y debe ser único dentro de este tipo, por ejemplo ES."
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Nombre"
          required
          hint="Se muestra en los selectores y en los resúmenes de las reglas, por ejemplo España."
          error={errors.name?.message}
          {...register('name')}
        />

        <Checkbox
          label="Activo"
          hint="Los valores inactivos permanecen asignados a los usuarios que ya los tienen, pero no podrán seleccionarse de nuevo."
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
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// icono boton
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