import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import SuperadminDashboardClient from './SuperadminClient';

export const dynamic = 'force-dynamic';

export default async function SuperadminPage() {
  const user = await getCurrentUser();

  // If not logged in or role is not superadmin, show 404 (Not Found)
  // so random visitors have zero clue this portal exists
  if (!user || user.role !== 'superadmin') {
    notFound();
  }

  return <SuperadminDashboardClient userEmail={user.email} />;
}
