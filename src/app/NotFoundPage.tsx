import { Link } from 'react-router-dom';

import { Card } from '@/shared/components/Card';
import { EmptyState } from '@/shared/components/States';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        title="Page not found"
        description="The page you were looking for does not exist or you no longer have access to it."
        action={
          <Link
            to="/dashboard"
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            Back to dashboard
          </Link>
        }
      />
    </Card>
  );
}
