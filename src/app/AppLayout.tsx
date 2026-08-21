import { useEffect, useRef, useState } from 'react';

import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { RoleBadge } from '@/shared/components/Badges';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/shared/utils/cn';

type NavItem = {
  to: string;
  label: string;
  adminOnly?: boolean;
  approverOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/reports', label: 'Informes' },
  { to: '/expenses', label: 'Gastos' },
  { to: '/approvals', label: 'Aprobaciones', approverOnly: true },
];

const SETTINGS_NAV: NavItem[] = [
  {
    to: '/settings/categories',
    label: 'Categorías',
    adminOnly: true,
  },
  {
    to: '/settings/warning-rules',
    label: 'Reglas de avisos',
    adminOnly: true,
  },
  {
    to: '/settings/approval-rules',
    label: 'Reglas de aprobación',
    adminOnly: true,
  },
  {
    to: '/settings/org-attributes',
    label: 'Organización',
    adminOnly: true,
  },
  {
    to: '/settings/users',
    label: 'Usuarios',
    adminOnly: true,
  },
];

export function AppLayout() {
  const { user, logout, isAdmin, canApprove } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const navScrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const visible = (item: NavItem) =>
    (!item.adminOnly || isAdmin) &&
    (!item.approverOnly || canApprove);

  const primary = PRIMARY_NAV.filter(visible);
  const settings = SETTINGS_NAV.filter(visible);

  const navigationItems = [...primary, ...settings];

  async function handleLogout() {
    await logout();

    navigate('/login', { replace: true });
  }

  function updateScrollState() {
    const element = navScrollRef.current;

    if (!element) {
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const overflow = maxScrollLeft > 2;

    setHasOverflow(overflow);
    setCanScrollLeft(element.scrollLeft > 2);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 2);
  }

  function scrollNavigation(direction: 'left' | 'right') {
    const element = navScrollRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction === 'left' ? -280 : 280,
      behavior: 'smooth',
    });
  }

  useEffect(() => {
    const element = navScrollRef.current;

    if (!element) {
      return;
    }

    updateScrollState();

    const handleScroll = () => {
      updateScrollState();
    };

    const handleResize = () => {
      updateScrollState();
    };

    element.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });

    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [isAdmin, canApprove]);

  return (
    <div className="min-h-dvh bg-[#f4f6f9]">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex min-h-[64px] max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
          {/* Marca */}
          <NavLink
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-xs font-bold text-white shadow-sm">
              GG
            </span>

            <span className="hidden whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-[#0d1117] lg:block">
              Gestión de Gastos
            </span>
          </NavLink>

          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            className="ml-auto inline-flex h-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white px-3 text-sm font-medium text-[#374151] shadow-sm transition-colors hover:bg-[#f7f7f8] sm:hidden"
          >
            {menuOpen ? 'Cerrar' : 'Menú'}
          </button>

          {/* Navegación */}
          <nav
            id="primary-navigation"
            aria-label="Navegación principal"
            className={cn(
              'order-last w-full sm:order-none sm:min-w-0 sm:flex-1',
              menuOpen ? 'block' : 'hidden sm:block'
            )}
          >
            {/* Navegación escritorio */}
            <div className="hidden min-w-0 items-center sm:flex">
              {/* Flecha izquierda */}
              {hasOverflow && (
                <button
                  type="button"
                  onClick={() => scrollNavigation('left')}
                  disabled={!canScrollLeft}
                  aria-label="Desplazar navegación hacia la izquierda"
                  className={cn(
                    'mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    canScrollLeft
                      ? 'text-[#6b7280] hover:bg-[#f4f4f5] hover:text-[#111827]'
                      : 'cursor-default text-[#d1d5db]'
                  )}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path
                      d="M12.5 15 7.5 10l5-5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Zona desplazable */}
              <div
                ref={navScrollRef}
                className="min-w-0 flex-1 scroll-smooth overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <ul className="flex w-max items-center gap-1">
                  {navigationItems.map((item) => (
                    <li key={item.to} className="shrink-0">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            'block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-[#ede9fe] text-[#4338ca]'
                              : 'text-[#6b7280] hover:bg-[#f4f4f5] hover:text-[#111827]'
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Flecha derecha */}
              {hasOverflow && (
                <button
                  type="button"
                  onClick={() => scrollNavigation('right')}
                  disabled={!canScrollRight}
                  aria-label="Desplazar navegación hacia la derecha"
                  className={cn(
                    'ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    canScrollRight
                      ? 'text-[#6b7280] hover:bg-[#f4f4f5] hover:text-[#111827]'
                      : 'cursor-default text-[#d1d5db]'
                  )}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path
                      d="m7.5 5 5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Navegación móvil */}
            <div className="pt-3 sm:hidden">
              <ul className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-[#ede9fe] text-[#4338ca]'
                            : 'text-[#6b7280] hover:bg-[#f4f4f5] hover:text-[#111827]'
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/* Usuario móvil */}
              <div className="mt-4 border-t border-black/[0.06] pt-4">
                {user && (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {user.fullName}
                      </p>

                      <p className="truncate text-xs text-[#9ca3af]">
                        {user.email}
                      </p>
                    </div>

                    <RoleBadge role={user.role} />
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </nav>

          {/* Usuario escritorio */}
          <div className="ml-auto hidden shrink-0 items-center gap-3 sm:flex">
            <div className="h-7 w-px bg-black/[0.06]" />

            {user && (
              <div className="hidden text-right lg:block">
                <p className="max-w-[160px] truncate text-sm font-medium text-[#111827]">
                  {user.fullName}
                </p>

                <p className="max-w-[160px] truncate text-xs text-[#9ca3af]">
                  {user.email}
                </p>
              </div>
            )}

            {user && <RoleBadge role={user.role} />}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <Outlet />
      </main>
    </div>
  );
}