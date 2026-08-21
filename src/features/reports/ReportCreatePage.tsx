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
import { reportSchema, type ReportFormValues } from '@/shared/validation/schemas';

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
      // Redirige al detalle del informe, donde se pueden añadir los gastos.
      navigate(`/reports/${report.id}`, { replace: true });
    } catch (error) {
      const { fieldErrors, formError: message } = extractFormErrors(error);
      if (fieldErrors.title) {
        setError('title', { type: 'server', message: fieldErrors.title });
      }
      setFormError(message);
    }
  }

  return (
    <>
      <PageHeader
        title="New expense report"
        description="A report groups the expenses you submit for approval together."
        breadcrumb={[{ label: 'Reports', to: '/reports' }, { label: 'New' }]}
      />

      <Card className="max-w-xl">
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

            <Input
              label="Report title"
              required
              autoFocus
              placeholder="e.g. Barcelona conference, May 2026"
              hint="Give it a name you will recognise in the approvals inbox."
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                Create draft report
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/reports')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
