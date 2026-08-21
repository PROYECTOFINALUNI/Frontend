import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Field';
import { AlertBanner } from '@/shared/components/States';
import { extractFormErrors } from '@/shared/api/errors';
import { loginSchema, type LoginFormValues } from '@/shared/validation/schemas';
import { useAuth } from './useAuth';

const FEATURES = [
  'Cada gasto bajo control, desde el primer momento',
  'Aprobaciones más rápidas con reglas inteligentes',
  'La estructura de tu organización, conectada a cada decisión',
];

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      await login(values);

      navigate(from, { replace: true });
    } catch (error) {
      const { fieldErrors, formError: message } = extractFormErrors(error);

      for (const [field, error_] of Object.entries(fieldErrors)) {
        if (field === 'email' || field === 'password') {
          setError(field, {
            type: 'server',
            message: error_,
          });
        }
      }

      setFormError(message);
    }
  }

  return (
    <main
      className="flex min-h-dvh w-full bg-[#f4f6f9]"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* =========================================================
          PANEL PARTE IZQUIERDA
          ========================================================= */}
      <section className="relative hidden w-1/2 flex-col overflow-hidden bg-[#1e1b4b] lg:flex">
        {/* Gradientes */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.45) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 70%, rgba(79,70,229,0.35) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 10%, rgba(139,92,246,0.25) 0%, transparent 55%)',
          }}
        />

        {/* Patrón de puntos */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo parte arriba */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-10 pb-2">
          <LogoMark size={36} />

          <div>
            <p className="text-[10px] leading-none text-indigo-300">
              Gestión de gastos corporativos
            </p>
          </div>
        </div>

        {/* Parte central */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-10 pb-10">
          <div className="flex w-full max-w-[420px] flex-col justify-center">
            {/* Tarjeta decorativa */}
            <div className="mb-10 w-full rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.09] hover:shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="mb-0.5 text-xs font-medium text-indigo-300">Gastos este mes</p>

                  <p className="text-[1.75rem] font-bold tracking-[-0.03em] text-white">€ 48,230</p>
                </div>

                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-[#6ee7b7]">
                  ↓ 8.4%
                </div>
              </div>

              {/* Gráfico */}
              <div className="flex h-12 items-end gap-1.5">
                {[40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 95, 68].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${height}%`,
                      background: index === 11 ? 'rgba(129,140,248,0.9)' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>

              <p className="mt-3 text-xs text-indigo-300">Ene — Dic 2026</p>
            </div>

            <h2 className="mb-4 text-[1.875rem] font-bold leading-tight tracking-tight text-white">
              Control total de los gastos de tu empresa
            </h2>

            <p className="mb-8 text-sm leading-relaxed text-indigo-200">
              Convierte procesos complejos en un flujo simple, trazable y adaptado a la forma en que
              trabaja tu empresa.
            </p>

            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckIcon />

                  <span className="text-sm text-indigo-100">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Información parte de abajo */}
        <div className="relative z-10 px-10 pb-8">
          <div className="flex items-center gap-4">
            {['Gastos bajo control', 'Flujos automatizados', 'Visibilidad completa'].map((text) => (
              <div key={text} className="flex items-center gap-1.5">
                <div className="size-1 rounded-full bg-[#818cf8]" />

                <span className="text-[11px] text-indigo-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          PANEL PARTE DERECHA
          ========================================================= */}
      <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8 lg:py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo para móvil/tablet */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <LogoMark size={32} />

            <span className="text-base font-semibold tracking-tight text-[#0d1117]">
              Expense Management
            </span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="mb-1.5 text-2xl font-semibold tracking-[-0.025em] text-[#0d1117]">
              Iniciar sesión
            </h1>

            <p className="text-sm leading-relaxed text-[#6b7280]">
              Accede a tu cuenta para gestionar los gastos corporativos.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="username"
              placeholder="nombre@empresa.com"
              required
              error={errors.email?.message}
              className="
                h-11
                rounded-[10px]
                bg-[#f4f6f9]
                px-[14px]
                text-sm
                text-[#0d1117]
                shadow-[0_1px_2px_rgba(0,0,0,0.03)]
                ring-1
                ring-[rgba(13,17,23,0.10)]
                transition-all
                placeholder:text-[#9ca3af]
                focus:bg-white
                focus:ring-[#6366f1]
                focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
                aria-invalid:ring-red-500
                aria-invalid:focus:ring-red-600
              "
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              className="
                h-11
                rounded-[10px]
                bg-[#f4f6f9]
                px-[14px]
                text-sm
                text-[#0d1117]
                shadow-[0_1px_2px_rgba(0,0,0,0.03)]
                ring-1
                ring-[rgba(13,17,23,0.10)]
                transition-all
                placeholder:text-[#9ca3af]
                focus:bg-white
                focus:ring-[#6366f1]
                focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
                aria-invalid:ring-red-500
                aria-invalid:focus:ring-red-600
              "
              {...register('password')}
            />

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="
                mt-1
                h-11
                w-full
                rounded-[10px]
                bg-gradient-to-br
                from-[#4f46e5]
                to-[#6366f1]
                px-4
                py-0
                text-sm
                font-semibold
                text-white
                shadow-[0_4px_14px_rgba(79,70,229,0.38)]
                transition-all
                hover:from-[#3730a3]
                hover:to-[#4f46e5]
                hover:shadow-[0_6px_20px_rgba(79,70,229,0.48)]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#6366f1]
                focus-visible:ring-offset-2
                disabled:bg-none
                disabled:bg-brand-300
                disabled:shadow-none
              "
            >
              {isSubmitting ? (
                'Iniciando sesión…'
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRightIcon />
                </>
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-[11.5px] leading-relaxed text-[#9ca3af]">
            Las cuentas son creadas por el administrador.
          </p>
        </div>
      </section>
    </main>
  );
}

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#818cf8] shadow-[0_2px_8px_rgba(79,70,229,0.35)] "
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
      }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 14L8 9L11 12L17 6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="17" cy="6" r="1.5" fill="white" />
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="size-[15px] shrink-0 text-[#a5b4fc]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />

      <path
        d="m8.5 12 2.25 2.25L15.75 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="size-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
