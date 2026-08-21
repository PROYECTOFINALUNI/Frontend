/** Tipos de dominio que representan la estructura de datos utilizada por la API. Los nombres siguen el formato camelCase empleado por el backend.
 */

import type { CurrencyCode, WarningSeverity } from '@/shared/money/money';

export type { CurrencyCode, WarningSeverity };

/** Paginación de la API, con un máximo de 100 elementos por página. */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Representa un importe monetario; `display` muestra primero el código de moneda. */
export type Money = {
  currency: CurrencyCode;
  minor: string;
  decimal: string;
  display: string;
};

export type UserRole = 'EMPLOYEE' | 'APPROVER' | 'ADMIN';

export const USER_ROLES: UserRole[] = ['EMPLOYEE', 'APPROVER', 'ADMIN'];

/** Roles que pueden asignarse a un paso de aprobación. */
export type ApproverRole = Extract<UserRole, 'APPROVER' | 'ADMIN'>;

export const APPROVER_ROLES: ApproverRole[] = ['APPROVER', 'ADMIN'];

/** Las tres dimensiones organizativas asociadas a los usuarios y utilizadas por las reglas. */
export type OrgDimension = 'LOCATION' | 'DEPARTMENT' | 'POSITION';

export const ORG_DIMENSIONS: OrgDimension[] = ['LOCATION', 'DEPARTMENT', 'POSITION'];

export const ORG_DIMENSION_LABELS: Record<OrgDimension, string> = {
  LOCATION: 'Location',
  DEPARTMENT: 'Department',
  POSITION: 'Position',
};

/** Campo del usuario en el que se almacena cada dimensión organizativa. */
export const ORG_DIMENSION_FIELDS = {
  LOCATION: 'location',
  DEPARTMENT: 'department',
  POSITION: 'position',
} as const satisfies Record<OrgDimension, keyof User>;

export type OrgAttribute = {
  id: string;
  dimension: OrgDimension;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrgAttributeWrite = {
  dimension: OrgDimension;
  code: string;
  name: string;
  active: boolean;
};

/** El serializer de usuario expone `is_active` como `active` y agrupa los atributos organizativos. */
export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  location: OrgAttribute | null;
  department: OrgAttribute | null;
  position: OrgAttribute | null;
  createdAt: string;
  updatedAt: string;
};

/** Los atributos organizativos se asignan mediante su id; `null` elimina la asignación. */
export type UserOrgAttributeWrite = {
  locationId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: User;
};

export type RefreshResponse = {
  access: string;
/** Se incluye porque SIMPLE_JWT genera un nuevo refresh token en cada renovación. */
  refresh?: string;
};

export type CategoryFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN';

export const CATEGORY_FIELD_TYPES: CategoryFieldType[] = ['TEXT', 'NUMBER', 'BOOLEAN'];

/** Campo personalizado añadido por un administrador a una categoría. Si ya está en uso, puede renombrarse, reordenarse o desactivarse, pero no eliminarse ni cambiar de tipo.
 */
export type CategoryField = {
  id: string;
  name: string;
  fieldType: CategoryFieldType;
  required: boolean;
  active: boolean;
  displayOrder: number;
  inUse: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryFieldWrite = {
  id?: string;
  name: string;
  fieldType: CategoryFieldType;
  required: boolean;
  active: boolean;
};

export type Category = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  customFields: CategoryField[];
  createdAt: string;
  updatedAt: string;
};

export type CategoryWrite = {
  code: string;
  name: string;
  active: boolean;
  customFields: CategoryFieldWrite[];
};


export type WarningRule = {
  id: string;
  name: string;
  categoryId: string | null;
  currency: CurrencyCode;
  thresholdMinor: string;
  severity: WarningSeverity;
  message: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarningRuleWrite = {
  name: string;
  categoryId: string | null;
  currency: CurrencyCode;
  thresholdMinor: string;
  severity: WarningSeverity;
  message: string;
  active: boolean;
};

/** Define el grupo de aprobadores de un informe. Los criterios opcionales permiten aplicar la regla a cualquier valor y la prioridad determina el orden.
 */
export type ApprovalRule = {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  categoryId: string | null;
  currency: CurrencyCode;
  thresholdMinor: string;
  submitterLocationId: string | null;
  submitterDepartmentId: string | null;
  submitterPositionId: string | null;
  approverRole: ApproverRole | null;
  approverLocationId: string | null;
  approverDepartmentId: string | null;
  approverPositionId: string | null;
  approverPoolSize: number;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRuleWrite = Omit<
  ApprovalRule,
  'id' | 'approverPoolSize' | 'createdAt' | 'updatedAt'
>;

/** Aviso almacenado asociado a un gasto. El mensaje de la regla se guarda en el momento en que se evalúa.
 */
export type ExpenseWarning = {
  id: string;
  severity: WarningSeverity;
  message: string;
  createdAt: string;
};


export type PreviewWarning = {
  severity: WarningSeverity;
  message: string;
};

/** Representa la información del impuesto devuelta por la API. No incluye moneda ni modo; un `rateBps` de 0 indica que no se aplica impuesto.
 */
export type TaxRead = {
  rateBps: number;
  included: boolean;
  minor: string;
  decimal: string;
  display: string;
};

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PAID',
];

/**
 * `amount` representa el importe introducido por el usuario.
 * `netAmount` representa siempre el importe antes de impuestos.
 */

/** Valor almacenado de un campo personalizado de la categoría. Los valores numéricos se reciben como texto para mantener su precisión.
 */
export type ExpenseCustomFieldValue = {
  fieldId: string;
  name: string;
  fieldType: CategoryFieldType;
  value: string | boolean;
};

export type Expense = {
  id: string;
  reportId: string;
  merchant: string;
  expenseDate: string;
  category: Category | null;
  status: ExpenseStatus;
  amount: Money;
  netAmount: Money;
  tax: TaxRead;
  total: Money;
  warnings: ExpenseWarning[];
  customFields: ExpenseCustomFieldValue[];
  createdAt: string;
  updatedAt: string;
};

/** Los campos personalizados se envían como una lista para evitar que el identificador sea modificado por el conversor a camelCase. `null` elimina un valor opcional.
 */
export type ExpenseCustomFieldWrite = {
  fieldId: string;
  value: string | boolean | null;
};

/** Cuerpo de la petición para crear un gasto. La API rechaza campos adicionales. */
export type ExpenseWrite = {
  reportId: string;
  merchant: string;
  expenseDate: string;
  categoryId: string | null;
  currency: CurrencyCode;
  amountDecimal: string;
  tax: {
    rateBps: number;
    included: boolean;
  };
  customFields: ExpenseCustomFieldWrite[];
};


export type ExpensePatch = Partial<Omit<ExpenseWrite, 'reportId'>>;

export type ExpensePreview = {
  amount: Money;
  netAmount: Money;
  tax: TaxRead;
  total: Money;
  warnings: PreviewWarning[];
};

export type ReportStatus = ExpenseStatus;

export const REPORT_STATUSES: ReportStatus[] = EXPENSE_STATUSES;

export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

/** Indica el origen del paso; los pasos manuales sustituyen las reglas configuradas. */
export type ApprovalStepOrigin = 'RULE' | 'MANUAL' | 'DELEGATED';

/**
 * Un paso puede tener varios aprobadores posibles.
 * `decidedBy` indica quién tomó finalmente la decisión.
 */
export type ApprovalStep = {
  id: string;
  approvers: User[];
  stepOrder: number;
  status: ApprovalStepStatus;
  origin: ApprovalStepOrigin;
  ruleName: string | null;
  decidedBy: User | null;
  decidedAt: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};


export type ApprovalChainPreview = {
  autoApprove: boolean;
  manualOverride: boolean;
  steps: Array<{
    stepOrder: number;
    ruleId: string;
    ruleName: string;
    approvers: User[];
  }>;
};

export type ApprovalAction =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'AUTO_APPROVED'
  | 'REJECTED'
  | 'DELEGATED'
  | 'COMMENTED'
  | 'RETURNED_TO_DRAFT'
  | 'PAID';

export type ApprovalEvent = {
  id: string;
  actor: User;
  action: ApprovalAction;
  comment: string | null;
  createdAt: string;
};

/** Los totales del informe se agrupan por moneda, ya que puede contener gastos en distintas monedas. Un informe vacío devuelve una lista vacía.
 */
export type ReportListItem = {
  id: string;
  title: string;
  status: ReportStatus;
  expenseCount: number;
  totals: Money[];
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportDetail = ReportListItem & {
  owner: User;
  expenses: Expense[];
  approvalSteps: ApprovalStep[];
  events: ApprovalEvent[];
};

export type ExpenseListParams = {
  reportId?: string;
  status?: ExpenseStatus;
  categoryId?: string;
  currency?: CurrencyCode;
  expenseDateFrom?: string;
  expenseDateTo?: string;
  merchant?: string;
  ordering?: ExpenseOrdering;
  page?: number;
  pageSize?: number;
};

/** Solo estas tres opciones de ordenación están permitidas por la API. */
export type ExpenseOrdering =
  'expenseDate' | '-expenseDate' | 'createdAt' | '-createdAt' | 'total' | '-total';

export type ReportListParams = {
  role?: 'owner' | 'approver';
  status?: ReportStatus;
  pendingMyApproval?: boolean;
  page?: number;
  pageSize?: number;
};

export type UserListParams = {
  role?: UserRole;
  active?: boolean;
  search?: string;
  location?: string;
  department?: string;
  position?: string;
  page?: number;
  pageSize?: number;
};

export type OrgAttributeListParams = {
  dimension?: OrgDimension;
  active?: boolean;
  page?: number;
  pageSize?: number;
};
