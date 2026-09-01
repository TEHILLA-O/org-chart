'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  GitBranch,
  LayoutDashboard,
  MapPin,
  Network,
  Settings,
  Users,
  Briefcase,
  Plug,
  LineChart,
  Layers,
  Sparkles,
  Tags,
  PanelLeft,
  FileUp,
  Contact,
  Target,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: Array<{ href: string; label: string; icon: LucideIcon; badge?: string }> = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/charts', label: 'Org chart', icon: Network },
  { href: '/people', label: 'People', icon: Users },
  { href: '/directory', label: 'Directory', icon: Contact },
  { href: '/diagrams', label: 'Diagrams', icon: Workflow },
  { href: '/okrs', label: 'OKRs', icon: Target },
  { href: '/import', label: 'Import', icon: FileUp },
  { href: '/groups', label: 'Groups', icon: Tags },
  { href: '/positions', label: 'Positions', icon: Briefcase },
  { href: '/departments', label: 'Departments', icon: Layers },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/organisation', label: 'Organisation', icon: Building2 },
  { href: '/reports', label: 'Reports', icon: LineChart },
  { href: '/scenarios', label: 'Scenarios', icon: GitBranch },
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/administration', label: 'Admin', icon: Settings },
];

export function AppSidebar({
  collapsed,
  onToggle,
  userEmail,
  role,
}: {
  collapsed: boolean;
  onToggle: () => void;
  userEmail: string;
  role: string;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [assistantOn, setAssistantOn] = useState(false);

  useEffect(() => {
    setReady(true);
    fetch('/api/v1/assistant')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { settings?: { privacyReviewComplete?: boolean; modelConnected?: boolean } } | null) => {
        setAssistantOn(
          payload?.settings?.privacyReviewComplete === true && payload?.settings?.modelConnected === true,
        );
      })
      .catch(() => undefined);
  }, []);

  return (
    <aside
      className={cn(
        'no-print flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width]',
        collapsed ? 'w-[72px]' : 'w-[232px]',
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c9a227,#2f5d62)] text-sm font-bold text-white shadow-inner">
          O
        </div>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#e4c56a] uppercase">OrgPulse</p>
            <p className="truncate text-sm text-white/90">Northstar</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-3">
        {NAV.map((item) => {
          const active = ready && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const badge = item.href === '/assistant' ? (assistantOn ? 'On' : 'Off') : item.badge;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[var(--sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-0',
                active && 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {collapsed ? null : (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {badge ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tracking-wide text-[#e4c56a] uppercase">
                      {badge}
                    </span>
                  ) : null}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 px-2.5 pb-4">
        {collapsed ? null : (
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <p className="truncate text-xs text-white/85">{userEmail}</p>
            <p className="text-[10px] tracking-wide text-[var(--sidebar-muted)] uppercase">{role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-white"
        >
          <PanelLeft className="h-3.5 w-3.5" />
          {collapsed ? null : 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
