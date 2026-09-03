import { useState } from 'react';
import {
  useFieldArray,
  useForm,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

import {
  Checkbox,
  Input,
  Select,
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
  categorySchema,
  type CategoryFormValues,
} from '@/shared/validation/schemas';

import {
  CATEGORY_FIELD_TYPES,
  type Category,
  type CategoryFieldType,
  type CategoryWrite,
} from '@/shared/types/domain';

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/catalog/api';

/** Las filas nuevas no tienen id, por lo que la API las interpreta como campos que deben crearse */
function toCategoryWrite(
  values: CategoryFormValues
): CategoryWrite {
  return {
    code: values.code,
    name: values.name,
    active: values.active,
    customFields: values.customFields.map(
      ({ id, ...field }) =>
        id
          ? { id, ...field }
          : field
    ),
  };
}

export function CategoriesPage() {
  const query = useCategories();

  const createCategory =
    useCreateCategory();

  const updateCategory =
    useUpdateCategory();

  const deleteCategory =
    useDeleteCategory();

  const [editing, setEditing] =
    useState<Category | null>(null);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<Category | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  async function handleDelete() {
    if (!pendingDelete) return;

    setActionError(null);

    try {
      await deleteCategory.mutateAsync(
        pendingDelete.id
      );

      setPendingDelete(null);
    } catch (error) {
      // La API devuelve `category_in_use` cuando la categoría todavía está siendo utilizada
      setActionError(toMessage(error));

      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Las categorías agrupan los gastos y determinan qué reglas de avisos se aplican."
        breadcrumb={[
          {
            label: 'Ajustes',
          },
          {
            label: 'Categorías',
          },
        ]}
        actions={
          <Button
            onClick={() =>
              setIsCreating(true)
            }
          >
            <PlusIcon />
            Nueva categoría
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

      <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {query.isPending && (
          <TableSkeleton columns={5} />
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
              title="Aún no hay categorías"
              description="La base de datos se entrega vacía. Crea las categorías que utiliza tu organización, como Hotel, Comidas o Viajes."
              action={
                <Button
                  onClick={() =>
                    setIsCreating(true)
                  }
                >
                  Nueva categoría
                </Button>
              }
            />
          )}

        {query.isSuccess &&
          query.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">
                  Categorías de gastos
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
                      Campos personalizados
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
                    (category) => (
                      <tr
                        key={category.id}
                        className="transition-colors hover:bg-[#fafafa]"
                      >
                        <th
                          scope="row"
                          className="px-5 py-4 text-left font-mono text-xs font-normal text-[#697386]"
                        >
                          {category.code}
                        </th>

                        <td className="px-4 py-4 font-semibold text-[#202632]">
                          {category.name}
                        </td>

                        <td className="px-4 py-4 text-[#697386]">
                          {category.customFields.filter(
                            (field) =>
                              field.active
                          ).length || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              category.active
                                ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset'
                                : 'inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-2.5 py-1 text-xs font-semibold text-[#7c8798] ring-1 ring-black/[0.06] ring-inset'
                            }
                          >
                            <span
                              aria-hidden="true"
                            >
                              {category.active
                                ? '✓'
                                : '–'}
                            </span>

                            {category.active
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
                                  category
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
                                  category
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

      {/* crear categoría */}
      <CategoryDialog
        open={isCreating}
        title="Nueva categoría"
        onClose={() =>
          setIsCreating(false)
        }
        onSubmit={async (values) => {
          await createCategory.mutateAsync(
            toCategoryWrite(values)
          );

          setIsCreating(false);
        }}
      />

      {/* Editar categoría */}
      <CategoryDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Editar categoría"
        category={editing ?? undefined}
        onClose={() =>
          setEditing(null)
        }
        onSubmit={async (values) => {
          if (!editing) return;

          await updateCategory.mutateAsync({
            id: editing.id,
            ...toCategoryWrite(values),
          });

          setEditing(null);
        }}
      />

      {/* Eliminar categoría */}
      <Modal
        open={pendingDelete !== null}
        onClose={() =>
          setPendingDelete(null)
        }
        title="¿Eliminar esta categoría?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.code}). Las categorías utilizadas por un gasto o una regla no se pueden eliminar; desactívalas en su lugar.`
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
                deleteCategory.isPending
              }
            >
              Eliminar categoría
            </Button>
          </>
        }
      />
    </>
  );
}

function CategoryDialog({
  open,
  title,
  category,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  category?: Category;
  onClose: () => void;
  onSubmit: (
    values: CategoryFormValues
  ) => Promise<void>;
}) {
  const [formError, setFormError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: category?.code ?? '',
      name: category?.name ?? '',
      active:
        category?.active ?? true,
      customFields:
        category?.customFields.map(
          (field) => ({
            id: field.id,
            name: field.name,
            fieldType:
              field.fieldType,
            required:
              field.required,
            active: field.active,
          })
        ) ?? [],
    },
  });

  const inUseIds = new Set(
    (
      category?.customFields ?? []
    )
      .filter(
        (field) => field.inUse
      )
      .map((field) => field.id)
  );

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

              // Los errores de `customFields` que no pueden asociarse a un campo concreto se muestran a nivel general del formulario
              setFormError(
                fieldErrors.customFields ??
                message
              );
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
          label="Código"
          required
          autoFocus
          hint="Se guarda en mayúsculas y debe ser único, por ejemplo HOTEL."
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Nombre"
          required
          hint="Se muestra en los selectores y en las tablas."
          error={errors.name?.message}
          {...register('name')}
        />

        <Checkbox
          label="Activa"
          hint="Las categorías inactivas permanecen en los gastos existentes, pero no se pueden seleccionar para nuevos gastos."
          {...register('active')}
        />

        <CustomFieldEditor
          control={control}
          register={register}
          errors={errors}
          inUseIds={inUseIds}
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
            Guardar categoría
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const FIELD_TYPE_LABELS: Record<
  CategoryFieldType,
  string
> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  BOOLEAN: 'Sí / no',
};

/** Permite gestionar los campos personalizados de una categoría. Los campos que ya tienen valores no pueden cambiar de tipo ni eliminarse. */
function CustomFieldEditor({
  control,
  register,
  errors,
  inUseIds,
}: {
  control: Control<CategoryFormValues>;
  register: UseFormRegister<CategoryFormValues>;
  errors: ReturnType<
    typeof useForm<CategoryFormValues>
  >['formState']['errors'];
  inUseIds: Set<string>;
}) {
  // Se usa `keyName` para evitar conflictos con el `id` propio del campo.
  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'customFields',
    keyName: 'key',
  });

  return (
    <fieldset className="space-y-3 border-t border-black/[0.06] pt-5">
      <legend className="text-sm font-semibold text-[#202632]">
        Campos personalizados
      </legend>

      <div className="flex items-start justify-between gap-3">
        <p className="max-w-md text-xs leading-5 text-[#8b95a5]">
          Preguntas adicionales que se
          muestran en el formulario de
          gasto cuando se selecciona esta
          categoría.
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            append({
              id: '',
              name: '',
              fieldType: 'TEXT',
              required: false,
              active: true,
            })
          }
        >
          <PlusIcon />
          Añadir
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="rounded-lg bg-[#fbfbfc] px-3 py-3 text-sm text-[#7c8798]">
          No hay campos personalizados. Los
          gastos de esta categoría solo
          solicitarán los datos estándar.
        </p>
      )}

      <ol className="space-y-3">
        {fields.map(
          (field, index) => {
            const inUse =
              inUseIds.has(field.id);

            return (
              <li
                key={field.key}
                className="rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={`Campo ${index + 1}`}
                    required
                    error={
                      errors
                        .customFields?.[
                        index
                      ]?.name?.message
                    }
                    {...register(
                      `customFields.${index}.name`
                    )}
                  />

                  <Select
                    label={`Tipo del campo ${index + 1}`}
                    disabled={inUse}
                    hint={
                      inUse
                        ? 'Bloqueado: este campo ya tiene valores guardados.'
                        : undefined
                    }
                    {...register(
                      `customFields.${index}.fieldType`
                    )}
                  >
                    {CATEGORY_FIELD_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {
                            FIELD_TYPE_LABELS[
                            type
                            ]
                          }
                        </option>
                      )
                    )}
                  </Select>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-4">
                    <Checkbox
                      label={`Campo ${index + 1} obligatorio`}
                      {...register(
                        `customFields.${index}.required`
                      )}
                    />

                    {inUse && (
                      <Checkbox
                        label={`Campo ${index + 1} activo`}
                        hint="Los campos inactivos se mantienen en gastos anteriores, pero no se volverán a solicitar."
                        {...register(
                          `customFields.${index}.active`
                        )}
                      />
                    )}
                  </div>

                  {inUse ? (
                    <p className="text-xs leading-5 text-[#8b95a5]">
                      Está en uso, por lo
                      que no se puede
                      eliminar. Desmarca la
                      opción de activo para
                      retirarlo.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        remove(index)
                      }
                    >
                      Eliminar campo{' '}
                      {index + 1}
                    </Button>
                  )}
                </div>

                <input
                  type="hidden"
                  {...register(
                    `customFields.${index}.id`
                  )}
                />
              </li>
            );
          }
        )}
      </ol>
    </fieldset>
  );
}

// icono + para el boton

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