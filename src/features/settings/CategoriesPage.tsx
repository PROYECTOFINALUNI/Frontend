import { useState } from 'react';
import { useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Checkbox, Input, Select } from '@/shared/components/Field';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { AlertBanner, EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { extractFormErrors, toMessage } from '@/shared/api/errors';
import { categorySchema, type CategoryFormValues } from '@/shared/validation/schemas';
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

/** Las filas nuevas no tienen id, por lo que la API las interpreta como campos que deben crearse. */
function toCategoryWrite(values: CategoryFormValues): CategoryWrite {
  return {
    code: values.code,
    name: values.name,
    active: values.active,
    customFields: values.customFields.map(({ id, ...field }) => (id ? { id, ...field } : field)),
  };
}

export function CategoriesPage() {
  const query = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editing, setEditing] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete() {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteCategory.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      // La API devuelve `category_in_use` cuando la categoría todavía está siendo utilizada.
      setActionError(toMessage(error));
      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories group expenses and scope which warning rules apply."
        breadcrumb={[{ label: 'Settings' }, { label: 'Categories' }]}
        actions={<Button onClick={() => setIsCreating(true)}>New category</Button>}
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">{actionError}</AlertBanner>
        </div>
      )}

      <Card>
        {query.isPending && <TableSkeleton columns={5} />}
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && query.data.length === 0 && (
          <EmptyState
            title="No categories yet"
            description="The database ships empty. Create the categories your organisation uses, such as Hotel, Meals, or Travel."
            action={<Button onClick={() => setIsCreating(true)}>New category</Button>}
          />
        )}

        {query.isSuccess && query.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">Expense categories</caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Custom fields
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-2 text-left font-mono text-xs font-normal">
                      {category.code}
                    </th>
                    <td className="px-4 py-2 font-medium text-slate-900">{category.name}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {category.customFields.filter((field) => field.active).length || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          category.active
                            ? 'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-300 ring-inset'
                            : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 ring-inset'
                        }
                      >
                        <span aria-hidden="true">{category.active ? '✓' : '–'}</span>
                        {category.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(category)}
                        >
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

      <CategoryDialog
        open={isCreating}
        title="New category"
        onClose={() => setIsCreating(false)}
        onSubmit={async (values) => {
          await createCategory.mutateAsync(toCategoryWrite(values));
          setIsCreating(false);
        }}
      />

      <CategoryDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title="Edit category"
        category={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return;
          await updateCategory.mutateAsync({ id: editing.id, ...toCategoryWrite(values) });
          setEditing(null);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this category?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.code}). Categories referenced by an expense or a rule cannot be deleted; deactivate them instead.`
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
              isLoading={deleteCategory.isPending}
            >
              Delete category
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
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: category?.code ?? '',
      name: category?.name ?? '',
      active: category?.active ?? true,
      customFields:
        category?.customFields.map((field) => ({
          id: field.id,
          name: field.name,
          fieldType: field.fieldType,
          required: field.required,
          active: field.active,
        })) ?? [],
    },
  });

  const inUseIds = new Set(
    (category?.customFields ?? []).filter((field) => field.inUse).map((field) => field.id)
  );

  function close() {
    setFormError(null);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={title}>
      <form
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await onSubmit(values);
            reset();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            for (const [field, fieldMessage] of Object.entries(fieldErrors)) {
              if (field === 'code' || field === 'name' || field === 'active') {
                setError(field, { type: 'server', message: fieldMessage });
              }
            }
            // Los errores de `customFields` que no pueden asociarse a un campo concreto se muestran a nivel general del formulario.
            setFormError(fieldErrors.customFields ?? message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <Input
          label="Code"
          required
          autoFocus
          hint="Stored in upper case and must be unique, e.g. HOTEL."
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Name"
          required
          hint="Shown in pickers and tables."
          error={errors.name?.message}
          {...register('name')}
        />

        <Checkbox
          label="Active"
          hint="Inactive categories stay on existing expenses but cannot be selected for new ones."
          {...register('active')}
        />

        <CustomFieldEditor
          control={control}
          register={register}
          errors={errors}
          inUseIds={inUseIds}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save category
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const FIELD_TYPE_LABELS: Record<CategoryFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  BOOLEAN: 'Yes / no',
};

/** Permite gestionar los campos personalizados de una categoría. Los campos que ya tienen valores no pueden cambiar de tipo ni eliminarse.
 */
function CustomFieldEditor({
  control,
  register,
  errors,
  inUseIds,
}: {
  control: Control<CategoryFormValues>;
  register: UseFormRegister<CategoryFormValues>;
  errors: ReturnType<typeof useForm<CategoryFormValues>>['formState']['errors'];
  inUseIds: Set<string>;
}) {
  // Se usa `keyName` para evitar conflictos con el `id` propio del campo.
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'customFields',
    keyName: 'key',
  });

  return (
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <legend className="text-sm font-medium text-slate-800">Custom fields</legend>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          Extra questions the expense form asks whenever this category is selected.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            append({ id: '', name: '', fieldType: 'TEXT', required: false, active: true })
          }
        >
          Add field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-slate-500">
          No custom fields. Expenses in this category ask only for the standard details.
        </p>
      )}

      <ol className="space-y-3">
        {fields.map((field, index) => {
          const inUse = inUseIds.has(field.id);
          return (
            <li
              key={field.key}
              className="rounded-md bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={`Field ${index + 1} name`}
                  required
                  error={errors.customFields?.[index]?.name?.message}
                  {...register(`customFields.${index}.name`)}
                />
                <Select
                  label={`Field ${index + 1} type`}
                  disabled={inUse}
                  hint={inUse ? 'Locked: this field already has saved values.' : undefined}
                  {...register(`customFields.${index}.fieldType`)}
                >
                  {CATEGORY_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {FIELD_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4">
                  <Checkbox
                    label={`Field ${index + 1} required`}
                    {...register(`customFields.${index}.required`)}
                  />
                  {inUse && (
                    <Checkbox
                      label={`Field ${index + 1} active`}
                      hint="Inactive fields stay on past expenses but are not asked for again."
                      {...register(`customFields.${index}.active`)}
                    />
                  )}
                </div>
                {inUse ? (
                  <p className="text-xs text-slate-500">
                    In use, so it cannot be removed. Untick Active to retire it.
                  </p>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    Remove field {index + 1}
                  </Button>
                )}
              </div>
              {/* Round-trips the identifier that tells the API to update this definition
                  rather than replace it. Empty on a row the admin just added. */}
              <input type="hidden" {...register(`customFields.${index}.id`)} />
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}
