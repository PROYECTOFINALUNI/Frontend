import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { RoleBadge } from '@/shared/components/Badges';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/shared/utils/cn';

type NavItem = { to: string; label: string; adminOnly?: boolean; approverOnly?: boolean };

const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/reports', label: 'Reports' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/approvals', label: 'Approvals', approverOnly: true },
];

const SETTINGS_NAV: NavItem[] = [
  { to: '/settings/categories', label: 'Categories', adminOnly: true },
  { to: '/settings/warning-rules', label: 'Warning rules', adminOnly: true },
  { to: '/settings/approval-rules', label: 'Approval rules', adminOnly: true },
  { to: '/settings/org-attributes', label: 'Organisation', adminOnly: true },
  { to: '/settings/users', label: 'Users', adminOnly: true },
];

export function AppLayout() {
  const { user, logout, isAdmin, canApprove } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = (item: NavItem) =>
    (!item.adminOnly || isAdmin) && (!item.approverOnly || canApprove);

  const primary = PRIMARY_NAV.filter(visible);
  const settings = SETTINGS_NAV.filter(visible);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/dashboard" className="text-brand-700 text-base font-semibold">
            Expense Management
          </NavLink>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            className="ml-auto rounded-md px-3 py-1.5 text-sm ring-1 ring-slate-300 sm:hidden"
          >
            Menu
          </button>

          <nav
            id="primary-navigation"
            aria-label="Primary"
            className={cn(
              'order-last w-full sm:order-none sm:ml-4 sm:w-auto',
              menuOpen ? 'block' : 'hidden sm:block'
            )}
          >
            <ul className="flex flex-col gap-1 pt-2 sm:flex-row sm:items-center sm:gap-1 sm:pt-0">
              {[...primary, ...settings].map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            )}
            {user && <RoleBadge role={user.role} />}
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>

          {menuOpen && (
            <div className="w-full border-t border-slate-200 pt-3 sm:hidden">
              {user && (
                <p className="mb-2 text-sm text-slate-600">
                  {user.fullName} · {user.role.toLowerCase()}
                </p>
              )}
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
