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
          setError(field, { type: 'server', message: error_ });
        }
      }
      setFormError(message);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Expense Management</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to manage expenses and approvals.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

          <Input
            label="Email"
            type="email"
            autoComplete="username"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Accounts are created by an administrator. The API issues short-lived JWT access tokens.
        </p>
      </div>
    </main>
  );
}
