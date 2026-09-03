import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { Card, CardBody } from '@/shared/components/Card';
import { Input } from '@/shared/components/Field';
import { PageHeader } from '@/shared/components/PageHeader';
import { AlertBanner } from '@/shared/components/States';
import { extractFormErrors } from '@/shared/api/errors';

import {
  reportSchema,
  type ReportFormValues,
} from '@/shared/validation/schemas';

import { useCreateReport } from './api';

export function ReportCreatePage() {
  const navigate = useNavigate();

  const createReport = useCreateReport();

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: '' },
  });

  async function onSubmit(values: ReportFormValues) {
    setFormError(null);

    try {
      const report = await createReport.mutateAsync(values);

      // Redirige al detalle del informe, donde se pueden añadir los gastos
      navigate(`/reports/${report.id}`, { replace: true });
    } catch (error) {
      const {
        fieldErrors,
        formError: message,
      } = extractFormErrors(error);

      if (fieldErrors.title) {
        setError('title', {
          type: 'server',
          message: fieldErrors.title,
        });
      }

      setFormError(message);
    }
  }

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <PageHeader
        title="Nuevo informe de gastos"
        description="Crea un informe para agrupar los gastos que posteriormente enviarás a aprobación."
        breadcrumb={[
          {
            label: 'Informes',
            to: '/reports',
          },
          {
            label: 'Nuevo',
          },
        ]}
      />

      {/* FORMULARIO */}
      <Card className="max-w-xl overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <CardBody>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {formError && (
              <AlertBanner tone="error">
                {formError}
              </AlertBanner>
            )}

            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                Datos del informe
              </h2>

              <p className="mt-0.5 text-xs text-[#8b95a5]">
                Ponle un nombre claro para poder identificarlo fácilmente más adelante.
              </p>
            </div>

            <Input
              label="Título del informe"
              required
              autoFocus
              placeholder="Ej. Conferencia Barcelona, Mayo 2026"
              hint="Elige un nombre que puedas reconocer fácilmente en la bandeja de aprobaciones."
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-5">
              <Button
                type="submit"
                isLoading={isSubmitting}
              >
                Crear Informe
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/reports')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}