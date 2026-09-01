import { IntegrationsPanel } from '@/components/integrations/integrations-panel';
import { requireOrgContext } from '@/server/auth/session';

export default async function IntegrationsPage() {
  const ctx = await requireOrgContext(undefined, 'org:read');
  const canRefresh = ctx.role === 'OWNER' || ctx.role === 'ADMIN';

  return <IntegrationsPanel canRefresh={canRefresh} />;
}
