import { auth } from '@/auth';
import { IntegrationsPanel } from '@/components/integrations/integrations-panel';

export default async function IntegrationsPage() {
  const session = await auth();
  const role = session?.user.role ?? 'VIEWER';
  const canRefresh = role === 'OWNER' || role === 'ADMIN';

  return <IntegrationsPanel canRefresh={canRefresh} />;
}
