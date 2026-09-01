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
  Shield,
  Users,
  Briefcase,
  Plug,
  LineChart,
  Layers,
  Sparkles,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: Array<{ href: string; label: string; icon: LucideIcon; badge?: string }> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organisation', label: 'Organisation', icon: Building2 },
  { href: '/people', label: 'People', icon: Users },
  { href: '/groups', label: 'Groups', icon: Tags },
  { href: '/positions', label: 'Positions', icon: Briefcase },
  { href: '/departments', label: 'Departments', icon: Layers },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/charts', label: 'Charts', icon: Network },
  { href: '/assistant', label: 'Assistant', icon: Sparkles, badge: 'Off' },
  { href: '/scenarios', label: 'Scenarios', icon: GitBranch },
  { href: '/reports', label: 'Reports', icon: LineChart },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/administration', label: 'Administration', icon: Settings },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <aside
      className={cn(
        'no-print flex h-full flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width]',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3">
        <Shield className="h-5 w-5 text-[var(--accent)]" />
        {collapsed ? null : (
          <div>
            <p className="text-[10px] tracking-[0.25em] text-[var(--accent)] uppercase">OrgPulse</p>
            <p className="text-sm font-medium">Northstar</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = ready && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white',
                active && 'bg-white/10 text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {collapsed ? null : (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tracking-wide text-[var(--accent)] uppercase">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={onToggle}
        className="border-t border-white/10 px-3 py-3 text-left text-xs text-[var(--sidebar-muted)] hover:text-white"
      >
        {collapsed ? '»' : 'Collapse navigation'}
      </button>
    </aside>
  );
}
