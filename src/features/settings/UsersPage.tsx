import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Checkbox, Input, Select } from '@/shared/components/Field';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { RoleBadge } from '@/shared/components/Badges';
import { AlertBanner, EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { extractFormErrors } from '@/shared/api/errors';
import {
  setPasswordSchema,
  userCreateSchema,
  type SetPasswordFormValues,
  type UserCreateFormValues,
} from '@/shared/validation/schemas';
import {
  ORG_DIMENSIONS,
  ORG_DIMENSION_FIELDS,
  ORG_DIMENSION_LABELS,
  USER_ROLES,
  type OrgAttribute,
  type OrgDimension,
  type User,
} from '@/shared/types/domain';

import {
  useCreateUser,
  useOrgAttributes,
  useSetUserPassword,
  useUpdateUser,
  useUsers,
} from '@/features/catalog/api';

/** The `<dimension>Id` key each dimension is written under. */
const WRITE_KEYS = {
  LOCATION: 'locationId',
  DEPARTMENT: 'departmentId',
  POSITION: 'positionId',
} as const satisfies Record<OrgDimension, string>;

/** All three catalogs at once; every user row needs the same option lists. */
function useAttributeOptions(): Record<OrgDimension, OrgAttribute[]> {
  const locations = useOrgAttributes({ dimension: 'LOCATION' });
  const departments = useOrgAttributes({ dimension: 'DEPARTMENT' });
  const positions = useOrgAttributes({ dimension: 'POSITION' });
  return {
    LOCATION: locations.data ?? [],
    DEPARTMENT: departments.data ?? [],
    POSITION: positions.data ?? [],
  };
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const query = useUsers({ search: search || undefined });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const attributeOptions = useAttributeOptions();

  const [isCreating, setIsCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);

  const users = query.data?.results ?? [];
  const approverCount = users.filter(
    (user) => user.active && (user.role === 'APPROVER' || user.role === 'ADMIN')
  ).length;

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts, roles, and the organisation attributes that approval rules match on."
        breadcrumb={[{ label: 'Settings' }, { label: 'Users' }]}
        actions={<Button onClick={() => setIsCreating(true)}>New user</Button>}
      />

      {query.isSuccess && approverCount === 0 && (
        <div className="mb-4">
          <AlertBanner tone="warning" title="No eligible approvers">
            No active user has the Approver or Admin role, so no approval rule can resolve to anyone
            and every report will be approved automatically on submit.
          </AlertBanner>
        </div>
      )}

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <Input
            label="Search"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
        </div>

        {query.isPending && <TableSkeleton columns={8} />}
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && users.length === 0 && (
          <EmptyState
            title="No users found"
            description="Adjust the search, or create a new account."
          />
        )}

        {query.isSuccess && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">User accounts</caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Role
                  </th>
                  {ORG_DIMENSIONS.map((dimension) => (
                    <th
                      key={dimension}
                      scope="col"
                      className="px-4 py-2 text-left font-medium text-slate-600"
                    >
                      {ORG_DIMENSION_LABELS[dimension]}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-2 text-left font-medium text-slate-900">
                      {user.fullName}
                    </th>
                    <td className="px-4 py-2 text-slate-600">{user.email}</td>
                    <td className="px-4 py-2">
                      <Select
                        label="Role"
                        value={user.role}
                        onChange={(event) =>
                          updateUser.mutate({
                            id: user.id,
                            role: event.target.value as User['role'],
                          })
                        }
                        className="py-1 text-xs"
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </Select>
                    </td>
                    {ORG_DIMENSIONS.map((dimension) => (
                      <td key={dimension} className="px-4 py-2">
                        <Select
                          label={ORG_DIMENSION_LABELS[dimension]}
                          value={user[ORG_DIMENSION_FIELDS[dimension]]?.id ?? ''}
                          onChange={(event) =>
                            updateUser.mutate({
                              id: user.id,
                              [WRITE_KEYS[dimension]]: event.target.value || null,
                            })
                          }
                          className="py-1 text-xs"
                        >
                          <option value="">—</option>
                          {attributeOptions[dimension].map((attribute) => (
                            <option key={attribute.id} value={attribute.id}>
                              {attribute.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={user.active}
                          onChange={(event) =>
                            updateUser.mutate({ id: user.id, active: event.target.checked })
                          }
                          className="text-brand-600 focus:ring-brand-600 size-4 rounded border-slate-300"
                        />
                        {user.active ? 'Active' : 'Inactive'}
                      </label>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setPasswordFor(user)}>
                          Set password
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

      <div className="mt-4 flex flex-wrap gap-2">
        {USER_ROLES.map((role) => (
          <span key={role} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <RoleBadge role={role} />
            {role === 'EMPLOYEE' && 'creates reports and expenses'}
            {role === 'APPROVER' && 'can be selected by approval rules'}
            {role === 'ADMIN' && 'manages settings, chains, and marks reports paid'}
          </span>
        ))}
      </div>

      <CreateUserDialog
        open={isCreating}
        attributeOptions={attributeOptions}
        onClose={() => setIsCreating(false)}
        onSubmit={async ({ locationId, departmentId, positionId, ...values }) => {
          await createUser.mutateAsync({
            ...values,
            locationId: locationId || null,
            departmentId: departmentId || null,
            positionId: positionId || null,
          });
          setIsCreating(false);
        }}
      />

      <SetPasswordDialog
        key={passwordFor?.id ?? 'password'}
        user={passwordFor}
        onClose={() => setPasswordFor(null)}
      />
    </>
  );
}

function CreateUserDialog({
  open,
  attributeOptions,
  onClose,
  onSubmit,
}: {
  open: boolean;
  attributeOptions: Record<OrgDimension, OrgAttribute[]>;
  onClose: () => void;
  onSubmit: (values: UserCreateFormValues) => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      fullName: '',
      role: 'EMPLOYEE',
      active: true,
      password: '',
      locationId: '',
      departmentId: '',
      positionId: '',
    },
  });

  function close() {
    setFormError(null);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="New user">
      <form
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await onSubmit(values);
            reset();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            for (const [field, fieldMessage] of Object.entries(fieldErrors)) {
              if (field in values) {
                setError(field as keyof UserCreateFormValues, {
                  type: 'server',
                  message: fieldMessage,
                });
              }
            }
            setFormError(message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <Input
          label="Full name"
          required
          autoFocus
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />

        <Select label="Role" required error={errors.role?.message} {...register('role')}>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-3">
          {ORG_DIMENSIONS.map((dimension) => {
            const field = WRITE_KEYS[dimension];
            return (
              <Select
                key={dimension}
                label={ORG_DIMENSION_LABELS[dimension]}
                error={errors[field]?.message}
                {...register(field)}
              >
                <option value="">Not set</option>
                {attributeOptions[dimension].map((attribute) => (
                  <option key={attribute.id} value={attribute.id}>
                    {attribute.name}
                  </option>
                ))}
              </Select>
            );
          })}
        </div>

        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint="Validated by Django's password rules: at least 8 characters and not too common."
          error={errors.password?.message}
          {...register('password')}
        />

        <Checkbox label="Active" {...register('active')} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const setPassword = useSetUserPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '' },
  });

  function close() {
    setFormError(null);
    setSucceeded(false);
    reset();
    onClose();
  }

  return (
    <Modal
      open={user !== null}
      onClose={close}
      title="Set password"
      description={user ? `For ${user.fullName} (${user.email}).` : undefined}
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          if (!user) return;
          setFormError(null);
          try {
            await setPassword.mutateAsync({ id: user.id, password: values.password });
            setSucceeded(true);
            reset();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            if (fieldErrors.password) {
              setError('password', { type: 'server', message: fieldErrors.password });
            }
            setFormError(message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}
        {succeeded && <AlertBanner tone="success">Password updated.</AlertBanner>}

        <Input
          label="New password"
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Close
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Set password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
