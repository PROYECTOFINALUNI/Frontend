import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Checkbox, Input } from '@/shared/components/Field';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { AlertBanner, EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { extractFormErrors, toMessage } from '@/shared/api/errors';
import { orgAttributeSchema, type OrgAttributeFormValues } from '@/shared/validation/schemas';
import {
  ORG_DIMENSIONS,
  ORG_DIMENSION_LABELS,
  type OrgAttribute,
  type OrgDimension,
} from '@/shared/types/domain';

import {
  useCreateOrgAttribute,
  useDeleteOrgAttribute,
  useOrgAttributes,
  useUpdateOrgAttribute,
} from '@/features/catalog/api';

const DIMENSION_HINTS: Record<OrgDimension, string> = {
  LOCATION: 'Where people are based, at whatever granularity you need: Spain, Barcelona, EMEA.',
  DEPARTMENT: 'The team or function a person belongs to: IT, Finance, Sales.',
  POSITION: 'Seniority or job title used to pick approvers: Analyst, Manager, Director.',
};

export function OrgAttributesPage() {
  const [dimension, setDimension] = useState<OrgDimension>('LOCATION');
  const query = useOrgAttributes({ dimension });
  const createAttribute = useCreateOrgAttribute();
  const updateAttribute = useUpdateOrgAttribute();
  const deleteAttribute = useDeleteOrgAttribute();

  const [editing, setEditing] = useState<OrgAttribute | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<OrgAttribute | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const label = ORG_DIMENSION_LABELS[dimension];

  async function handleDelete() {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteAttribute.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
// La API devuelve `org_attribute_in_use` cuando el atributo todavía está siendo utilizado por un usuario o una regla.
      setActionError(toMessage(error));
      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Organisation attributes"
        description="Every user carries a location, a department and a position. Approval rules match on these to decide who reviews a report."
        breadcrumb={[{ label: 'Settings' }, { label: 'Organisation attributes' }]}
        actions={<Button onClick={() => setIsCreating(true)}>New {label.toLowerCase()}</Button>}
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">{actionError}</AlertBanner>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Attribute dimension">
        {ORG_DIMENSIONS.map((value) => (
          <Button
            key={value}
            role="tab"
            aria-selected={value === dimension}
            variant={value === dimension ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setDimension(value);
              setActionError(null);
            }}
          >
            {ORG_DIMENSION_LABELS[value]}
          </Button>
        ))}
      </div>

      <Card>
        <p className="mb-4 text-sm text-slate-600">{DIMENSION_HINTS[dimension]}</p>

        {query.isPending && <TableSkeleton columns={4} />}
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && query.data.length === 0 && (
          <EmptyState
            title={`No ${label.toLowerCase()} values yet`}
            description={DIMENSION_HINTS[dimension]}
            action={<Button onClick={() => setIsCreating(true)}>New {label.toLowerCase()}</Button>}
          />
        )}

        {query.isSuccess && query.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">{label} values</caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
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
                {query.data.map((attribute) => (
                  <tr key={attribute.id} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-2 text-left font-mono text-xs font-normal">
                      {attribute.code}
                    </th>
                    <td className="px-4 py-2 font-medium text-slate-900">{attribute.name}</td>
                    <td className="px-4 py-2 text-slate-600">
                      <span aria-hidden="true">{attribute.active ? '✓' : '–'}</span>
                      <span className="sr-only">{attribute.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(attribute)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(attribute)}
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

      <OrgAttributeDialog
        key={`create-${dimension}`}
        open={isCreating}
        title={`New ${label.toLowerCase()}`}
        dimension={dimension}
        onClose={() => setIsCreating(false)}
        onSubmit={async (values) => {
          await createAttribute.mutateAsync(values);
          setIsCreating(false);
        }}
      />

      <OrgAttributeDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        title={`Edit ${label.toLowerCase()}`}
        dimension={dimension}
        attribute={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={async ({ code, name, active }) => {
          if (!editing) return;
          await updateAttribute.mutateAsync({ id: editing.id, code, name, active });
          setEditing(null);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this value?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.code}). Values assigned to a user or referenced by an approval rule cannot be deleted; deactivate them instead.`
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
              isLoading={deleteAttribute.isPending}
            >
              Delete value
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
  onSubmit: (values: OrgAttributeFormValues) => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrgAttributeFormValues>({
    resolver: zodResolver(orgAttributeSchema),
    defaultValues: {
      dimension: attribute?.dimension ?? dimension,
      code: attribute?.code ?? '',
      name: attribute?.name ?? '',
      active: attribute?.active ?? true,
    },
  });

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
            setFormError(message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <input type="hidden" {...register('dimension')} />

        <Input
          label="Code"
          required
          autoFocus
          hint="Stored in upper case and unique within this dimension, e.g. ES."
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Name"
          required
          hint="Shown in pickers and rule summaries, e.g. Spain."
          error={errors.name?.message}
          {...register('name')}
        />

        <Checkbox
          label="Active"
          hint="Inactive values stay on the users that already have them but cannot be selected again."
          {...register('active')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save value
          </Button>
        </div>
      </form>
    </Modal>
  );
}
