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

import { PageHeader } from '@/shared/components/PageHeader';

import { RoleBadge } from '@/shared/components/Badges';

import {
  AlertBanner,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/shared/components/States';

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

/** La clave `<dimension>Id` donde se guarda cada dimensión. */
const WRITE_KEYS = {
  LOCATION: 'locationId',
  DEPARTMENT: 'departmentId',
  POSITION: 'positionId',
} as const satisfies Record<
  OrgDimension,
  string
>;

/* =========================================================
   ETIQUETAS VISIBLES
   Los valores internos siguen siendo los mismos.
========================================================= */

const DIMENSION_LABELS: Record<
  OrgDimension,
  string
> = {
  LOCATION: 'Ubicación',
  DEPARTMENT: 'Departamento',
  POSITION: 'Puesto',
};

const ROLE_LABELS: Record<
  User['role'],
  string
> = {
  EMPLOYEE: 'Empleado',
  APPROVER: 'Aprobador',
  ADMIN: 'Administrador',
};

/** Carga los tres catálogos porque cada usuario necesita las mismas opciones. */
function useAttributeOptions(): Record<
  OrgDimension,
  OrgAttribute[]
> {
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
    LOCATION: locations.data ?? [],
    DEPARTMENT: departments.data ?? [],
    POSITION: positions.data ?? [],
  };
}

export function UsersPage() {
  const [search, setSearch] =
    useState('');

  const query = useUsers({
    search: search || undefined,
  });

  const createUser = useCreateUser();

  const updateUser = useUpdateUser();

  const attributeOptions =
    useAttributeOptions();

  const [isCreating, setIsCreating] =
    useState(false);

  const [passwordFor, setPasswordFor] =
    useState<User | null>(null);

  /* Usuario pendiente de confirmar su desactivación */
  const [
    pendingDeactivate,
    setPendingDeactivate,
  ] = useState<User | null>(null);

  const users =
    query.data?.results ?? [];

  const approverCount = users.filter(
    (user) =>
      user.active &&
      (user.role === 'APPROVER' ||
        user.role === 'ADMIN')
  ).length;

  return (
    <>
      {/* =====================================================
          CABECERA
      ====================================================== */}
      <PageHeader
        title="Usuarios"
        description="Gestiona las cuentas, roles y datos de organización utilizados por las reglas de aprobación."
        breadcrumb={[
          {
            label: 'Ajustes',
          },
          {
            label: 'Usuarios',
          },
        ]}
        actions={
          <Button
            onClick={() =>
              setIsCreating(true)
            }
          >
            <PlusIcon />
            Nuevo usuario
          </Button>
        }
      />

      {/* =====================================================
          AVISO DE APROBADORES
      ====================================================== */}
      {query.isSuccess &&
        approverCount === 0 && (
          <div className="mb-4">
            <AlertBanner
              tone="warning"
              title="No hay aprobadores disponibles"
            >
              No hay ningún usuario activo
              con el rol de Aprobador o
              Administrador, por lo que las
              reglas de aprobación no pueden
              asignarse a nadie y los informes
              se aprobarán automáticamente al
              enviarse.
            </AlertBanner>
          </div>
        )}

      {/* =====================================================
          LISTADO DE USUARIOS
      ====================================================== */}
      <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {/* Búsqueda */}
        <div className="border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre o correo electrónico"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            className="max-w-sm"
          />
        </div>

        {query.isPending && (
          <TableSkeleton columns={8} />
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
          users.length === 0 && (
            <EmptyState
              title="No se han encontrado usuarios"
              description="Modifica la búsqueda o crea una nueva cuenta."
            />
          )}

        {query.isSuccess &&
          users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">
                  Cuentas de usuario
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
                      Correo electrónico
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                    >
                      Rol
                    </th>

                    {ORG_DIMENSIONS.map(
                      (dimension) => (
                        <th
                          key={dimension}
                          scope="col"
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                        >
                          {
                            DIMENSION_LABELS[
                            dimension
                            ]
                          }
                        </th>
                      )
                    )}

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
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-[#fafafa]"
                    >
                      {/* NOMBRE */}
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-semibold text-[#202632]"
                      >
                        {user.fullName}
                      </th>

                      {/* EMAIL */}
                      <td className="whitespace-nowrap px-4 py-4 text-[#697386]">
                        {user.email}
                      </td>

                      {/* ROL */}
                      <td className="min-w-36 px-4 py-4">
                        <Select
                          label="Rol"
                          value={user.role}
                          onChange={(
                            event
                          ) =>
                            updateUser.mutate({
                              id: user.id,
                              role: event
                                .target
                                .value as User['role'],
                            })
                          }
                          className="py-1 text-xs"
                        >
                          {USER_ROLES.map(
                            (role) => (
                              <option
                                key={role}
                                value={role}
                              >
                                {
                                  ROLE_LABELS[
                                  role
                                  ]
                                }
                              </option>
                            )
                          )}
                        </Select>
                      </td>

                      {/* ATRIBUTOS DE ORGANIZACIÓN */}
                      {ORG_DIMENSIONS.map(
                        (dimension) => (
                          <td
                            key={dimension}
                            className="min-w-36 px-4 py-4"
                          >
                            <Select
                              label={
                                DIMENSION_LABELS[
                                dimension
                                ]
                              }
                              value={
                                user[
                                  ORG_DIMENSION_FIELDS[
                                  dimension
                                  ]
                                ]?.id ??
                                ''
                              }
                              onChange={(
                                event
                              ) =>
                                updateUser.mutate(
                                  {
                                    id: user.id,
                                    [WRITE_KEYS[
                                      dimension
                                    ]]:
                                      event
                                        .target
                                        .value ||
                                      null,
                                  }
                                )
                              }
                              className="py-1 text-xs"
                            >
                              <option value="">
                                —
                              </option>

                              {attributeOptions[
                                dimension
                              ].map(
                                (
                                  attribute
                                ) => (
                                  <option
                                    key={
                                      attribute.id
                                    }
                                    value={
                                      attribute.id
                                    }
                                  >
                                    {
                                      attribute.name
                                    }
                                  </option>
                                )
                              )}
                            </Select>
                          </td>
                        )
                      )}

                      {/* =================================================
                          ESTADO
                          Activar es inmediato.
                          Desactivar requiere confirmación.
                      ================================================== */}
                      <td className="px-4 py-4">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              user.active
                            }
                            onChange={(
                              event
                            ) => {
                              const nextActive =
                                event
                                  .target
                                  .checked;

                              /*
                               * Si estamos activando el usuario,
                               * mantenemos el comportamiento original.
                               */
                              if (
                                nextActive
                              ) {
                                updateUser.mutate(
                                  {
                                    id: user.id,
                                    active: true,
                                  }
                                );

                                return;
                              }

                              /*
                               * Si estamos desactivándolo,
                               * todavía NO enviamos nada.
                               * Primero abrimos el modal.
                               */
                              setPendingDeactivate(
                                user
                              );
                            }}
                            className="size-4 rounded border-slate-300 text-[#5b50f6] focus:ring-[#5b50f6]"
                          />

                          <span
                            className={
                              user.active
                                ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset'
                                : 'inline-flex items-center rounded-full bg-[#f4f4f5] px-2.5 py-1 text-xs font-semibold text-[#7c8798] ring-1 ring-black/[0.06] ring-inset'
                            }
                          >
                            {user.active
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
                        </label>
                      </td>

                      {/* ACCIONES */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setPasswordFor(
                                user
                              )
                            }
                          >
                            Cambiar contraseña
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

      {/* =====================================================
          INFORMACIÓN SOBRE LOS ROLES
      ====================================================== */}
      <div className="mt-4 rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]">
          Permisos por rol
        </p>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {USER_ROLES.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-2 text-xs text-[#697386]"
            >
              {/*
               * RoleBadge es global, así que se mantiene
               * intacto en este componente.
               */}
              <RoleBadge role={role} />

              {role === 'EMPLOYEE' &&
                'crea informes y gastos'}

              {role === 'APPROVER' &&
                'puede ser seleccionado por las reglas de aprobación'}

              {role === 'ADMIN' &&
                'gestiona ajustes, cadenas de aprobación y marca informes como pagados'}
            </span>
          ))}
        </div>
      </div>

      {/* =====================================================
          CONFIRMAR DESACTIVACIÓN DE USUARIO
      ====================================================== */}
      <Modal
        open={
          pendingDeactivate !== null
        }
        onClose={() =>
          setPendingDeactivate(null)
        }
        title="¿Desactivar este usuario?"
        description={
          pendingDeactivate
            ? `Vas a desactivar la cuenta de ${pendingDeactivate.fullName} (${pendingDeactivate.email}). Si es tu propia cuenta, podrías perder el acceso a la aplicación.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setPendingDeactivate(
                  null
                )
              }
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                if (
                  !pendingDeactivate
                ) {
                  return;
                }

                updateUser.mutate({
                  id:
                    pendingDeactivate.id,
                  active: false,
                });

                setPendingDeactivate(
                  null
                );
              }}
            >
              Desactivar usuario
            </Button>
          </>
        }
      />

      {/* =====================================================
          CREAR USUARIO
      ====================================================== */}
      <CreateUserDialog
        open={isCreating}
        attributeOptions={
          attributeOptions
        }
        onClose={() =>
          setIsCreating(false)
        }
        onSubmit={async ({
          locationId,
          departmentId,
          positionId,
          ...values
        }) => {
          await createUser.mutateAsync({
            ...values,
            locationId:
              locationId || null,
            departmentId:
              departmentId || null,
            positionId:
              positionId || null,
          });

          setIsCreating(false);
        }}
      />

      {/* =====================================================
          CAMBIAR CONTRASEÑA
      ====================================================== */}
      <SetPasswordDialog
        key={
          passwordFor?.id ??
          'password'
        }
        user={passwordFor}
        onClose={() =>
          setPasswordFor(null)
        }
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
  attributeOptions: Record<
    OrgDimension,
    OrgAttribute[]
  >;
  onClose: () => void;
  onSubmit: (
    values: UserCreateFormValues
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
  } = useForm<UserCreateFormValues>({
    resolver: zodResolver(
      userCreateSchema
    ),
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
    <Modal
      open={open}
      onClose={close}
      title="Nuevo usuario"
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
                if (field in values) {
                  setError(
                    field as keyof UserCreateFormValues,
                    {
                      type: 'server',
                      message:
                        fieldMessage,
                    }
                  );
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
          label="Nombre completo"
          required
          autoFocus
          error={
            errors.fullName?.message
          }
          {...register('fullName')}
        />

        <Input
          label="Correo electrónico"
          type="email"
          required
          autoComplete="off"
          error={
            errors.email?.message
          }
          {...register('email')}
        />

        <Select
          label="Rol"
          required
          error={
            errors.role?.message
          }
          {...register('role')}
        >
          {USER_ROLES.map((role) => (
            <option
              key={role}
              value={role}
            >
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>

        {/* =================================================
            ATRIBUTOS DE ORGANIZACIÓN
        ================================================== */}
        <div className="rounded-xl border border-black/[0.06] bg-[#fbfbfc] p-4">
          <p className="mb-3 text-sm font-semibold text-[#202632]">
            Organización
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {ORG_DIMENSIONS.map(
              (dimension) => {
                const field =
                  WRITE_KEYS[
                  dimension
                  ];

                return (
                  <Select
                    key={
                      dimension
                    }
                    label={
                      DIMENSION_LABELS[
                      dimension
                      ]
                    }
                    error={
                      errors[field]
                        ?.message
                    }
                    {...register(
                      field
                    )}
                  >
                    <option value="">
                      Sin asignar
                    </option>

                    {attributeOptions[
                      dimension
                    ].map(
                      (
                        attribute
                      ) => (
                        <option
                          key={
                            attribute.id
                          }
                          value={
                            attribute.id
                          }
                        >
                          {
                            attribute.name
                          }
                        </option>
                      )
                    )}
                  </Select>
                );
              }
            )}
          </div>
        </div>

        <Input
          label="Contraseña"
          type="password"
          required
          autoComplete="new-password"
          hint="Se valida según las reglas de contraseña de Django: debe tener al menos 8 caracteres y no ser demasiado común."
          error={
            errors.password?.message
          }
          {...register('password')}
        />

        <Checkbox
          label="Activo"
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
            isLoading={
              isSubmitting
            }
          >
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SetPasswordDialog({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const setPassword =
    useSetUserPassword();

  const [formError, setFormError] =
    useState<string | null>(null);

  const [succeeded, setSucceeded] =
    useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(
      setPasswordSchema
    ),
    defaultValues: {
      password: '',
    },
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
      title="Cambiar contraseña"
      description={
        user
          ? `Para ${user.fullName} (${user.email}).`
          : undefined
      }
    >
      <form
        onSubmit={handleSubmit(
          async (values) => {
            if (!user) return;

            setFormError(null);

            try {
              await setPassword.mutateAsync(
                {
                  id: user.id,
                  password:
                    values.password,
                }
              );

              setSucceeded(true);

              reset();
            } catch (error) {
              const {
                fieldErrors,
                formError: message,
              } =
                extractFormErrors(error);

              if (
                fieldErrors.password
              ) {
                setError(
                  'password',
                  {
                    type: 'server',
                    message:
                      fieldErrors.password,
                  }
                );
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

        {succeeded && (
          <AlertBanner tone="success">
            Contraseña actualizada.
          </AlertBanner>
        )}

        <Input
          label="Nueva contraseña"
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          error={
            errors.password?.message
          }
          {...register('password')}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
          >
            Cerrar
          </Button>

          <Button
            type="submit"
            isLoading={
              isSubmitting
            }
          >
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Icono + para crear un usuario
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