import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/app/AppLayout';
import { RequireAuth } from '@/app/RequireAuth';
import { NotFoundPage } from '@/app/NotFoundPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ApprovalInboxPage } from '@/features/approvals/ApprovalInboxPage';
import { ExpenseDetailPage } from '@/features/expenses/ExpenseDetailPage';
import { ExpenseFormPage } from '@/features/expenses/ExpenseFormPage';
import { ExpenseListPage } from '@/features/expenses/ExpenseListPage';
import { ReportCreatePage } from '@/features/reports/ReportCreatePage';
import { ReportDetailPage } from '@/features/reports/ReportDetailPage';
import { ReportListPage } from '@/features/reports/ReportListPage';
import { ApprovalRulesPage } from '@/features/settings/ApprovalRulesPage';
import { CategoriesPage } from '@/features/settings/CategoriesPage';
import { OrgAttributesPage } from '@/features/settings/OrgAttributesPage';
import { UsersPage } from '@/features/settings/UsersPage';
import { WarningRulesPage } from '@/features/settings/WarningRulesPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/reports" element={<ReportListPage />} />
          <Route path="/reports/new" element={<ReportCreatePage />} />
          <Route path="/reports/:reportId" element={<ReportDetailPage />} />
          {/* Expenses are created inside a report: the API requires a reportId. */}
          <Route path="/reports/:reportId/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/reports/:reportId/expenses/:expenseId/edit" element={<ExpenseFormPage />} />

          <Route path="/expenses" element={<ExpenseListPage />} />
          <Route path="/expenses/:expenseId" element={<ExpenseDetailPage />} />

          <Route element={<RequireAuth roles={['APPROVER', 'ADMIN']} />}>
            <Route path="/approvals" element={<ApprovalInboxPage />} />
          </Route>

          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="/settings/categories" element={<CategoriesPage />} />
            <Route path="/settings/warning-rules" element={<WarningRulesPage />} />
            <Route path="/settings/approval-rules" element={<ApprovalRulesPage />} />
            <Route path="/settings/org-attributes" element={<OrgAttributesPage />} />
            <Route path="/settings/users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
