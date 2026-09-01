'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Mail, Phone, GitBranch, Users, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PersonSkillsPanel } from '@/components/people/person-skills-panel';

interface HrBlock {
  employeeId?: string | null;
  startDate?: string | null;
  tenure?: string | null;
  holidayAllowanceDays?: number | null;
  holidayRemainingDays?: number | null;
  costCentre?: string | null;
  workingPattern?: string | null;
  ftePercent?: number | null;
  nextReviewDate?: string | null;
  probationEndDate?: string | null;
  contractEndDate?: string | null;
  noticePeriodDays?: number | null;
  employmentType?: string | null;
  allocationPercentage?: number | null;
}

interface Details {
  position: { id: string; title: string; status: string };
  isVacant: boolean;
  occupants: Array<{ id: string; displayName: string; email: string | null; phone: string | null; status: string }>;
  profile: {
    bio: string | null;
    profileLinkUrl: string | null;
    profileLinkUsername: string | null;
    profileLinkProvider: string | null;
    profilePhotoUrl: string | null;
  } | null;
  groups: Array<{ id: string; name: string; kind: string }>;
  department: { name: string; colour?: string | null } | null;
  location: { name: string } | null;
  manager: { positionId: string; title: string; personName: string } | null;
  secondaryManagers: Array<{ positionId: string; title: string; personName: string }>;
  directReports: Array<{ positionId: string; title: string; personName: string; isVacant: boolean }>;
  downstreamCount: number;
  reportingChain: Array<{ positionId: string; title: string; personName: string }>;
  otherPositions: Array<{ positionId: string; title: string }>;
  hr: HrBlock | null;
  provenance: Array<{ provider: string; externalId: string; entityType: string; lastSeenAt: string | null }>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function HrRow({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-medium">{children}</p>
    </div>
  );
}

export function DetailsDrawer({
  positionId,
  scenarioId,
  onClose,
  onFocus,
  canEdit,
  onCreateVacancy,
}: {
  positionId: string | null;
  scenarioId?: string | null;
  onClose: () => void;
  onFocus: (id: string) => void;
  canEdit: boolean;
  onCreateVacancy: (managerPositionId: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ['position', positionId, scenarioId],
    enabled: Boolean(positionId),
    queryFn: async () => {
      const params = scenarioId ? `?scenarioId=${scenarioId}` : '';
      const response = await fetch(`/api/v1/positions/${positionId}${params}`);
      if (!response.ok) throw new Error('Failed to load position');
      return (await response.json()) as Details;
    },
  });

  const occupant = data?.occupants[0];
  const hr = data?.hr;
  const allowance = Number(hr?.holidayAllowanceDays ?? 0);
  const remaining = Number(hr?.holidayRemainingDays ?? 0);
  const leavePct = allowance > 0 ? Math.min(100, Math.max(0, (remaining / allowance) * 100)) : 0;

  return (
    <Sheet open={Boolean(positionId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {!data ? (
          <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : (
          <div className="flex h-full flex-col overflow-y-auto p-6 pt-12">
            <div className="flex items-start gap-4">
              {data.profile?.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.profile.profilePhotoUrl}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-[#efeae1]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2f5d62] text-lg font-semibold text-white">
                  {data.isVacant ? '+' : (occupant?.displayName ?? '?').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl leading-tight font-semibold tracking-tight">
                  {occupant?.displayName ?? 'Open role'}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{data.position.title}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.isVacant ? <Badge tone="vacant">Open</Badge> : <Badge tone="sea">{occupant?.status}</Badge>}
                  {data.department ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white uppercase"
                      style={{ background: data.department.colour ?? '#2f5d62' }}
                    >
                      {data.department.name}
                    </span>
                  ) : null}
                  {data.location ? <Badge>{data.location.name}</Badge> : null}
                  {data.groups.map((group) => (
                    <Badge key={group.id} tone="gold">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {data.profile?.bio ? <p className="mt-4 text-sm leading-relaxed">{data.profile.bio}</p> : null}
            {data.profile?.profileLinkUrl ? (
              <a className="mt-2 inline-block text-sm font-medium text-[#2f5d62] underline" href={data.profile.profileLinkUrl} target="_blank" rel="noreferrer">
                Linked profile
                {data.profile.profileLinkUsername ? ` · ${data.profile.profileLinkUsername}` : ''}
              </a>
            ) : null}

            {occupant ? (
              <div className="mt-4">
                <PersonSkillsPanel personId={occupant.id} canEdit={canEdit} />
              </div>
            ) : null}

            <dl className="mt-6 space-y-1 text-sm">
              {occupant?.email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <a className="underline" href={`mailto:${occupant.email}`}>
                    {occupant.email}
                  </a>
                </div>
              ) : null}
              {occupant?.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--muted-foreground)]" />
                  {occupant.phone}
                </div>
              ) : null}

              {hr && Object.keys(hr).length > 0 ? (
                <div className="space-y-1 rounded-2xl bg-[#f6f4ef] p-4">
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[var(--muted-foreground)]">
                    <CalendarDays className="h-3 w-3" /> HR & operations
                  </p>
                  {hr.holidayAllowanceDays != null || hr.holidayRemainingDays != null ? (
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Holidays remaining</p>
                      <p className="font-medium">
                        {hr.holidayRemainingDays ?? '—'} of {hr.holidayAllowanceDays ?? '—'} days
                      </p>
                      {allowance > 0 ? (
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[#2f5d62]"
                            style={{ width: `${leavePct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <HrRow label="Employee ID">{hr.employeeId}</HrRow>
                  <HrRow label="Start date">
                    {formatDate(hr.startDate)}
                    {hr.tenure ? ` · ${hr.tenure}` : ''}
                  </HrRow>
                  <HrRow label="Employment">{formatLabel(hr.employmentType)}</HrRow>
                  <HrRow label="FTE">{hr.ftePercent != null ? `${hr.ftePercent}%` : null}</HrRow>
                  <HrRow label="Allocation">
                    {hr.allocationPercentage != null ? `${hr.allocationPercentage}% of this seat` : null}
                  </HrRow>
                  <HrRow label="Cost centre">{hr.costCentre}</HrRow>
                  <HrRow label="Working pattern">{hr.workingPattern}</HrRow>
                  <HrRow label="Notice period">
                    {hr.noticePeriodDays != null ? `${hr.noticePeriodDays} days` : null}
                  </HrRow>
                  <HrRow label="Next review">{formatDate(hr.nextReviewDate)}</HrRow>
                  <HrRow label="Probation ends">{formatDate(hr.probationEndDate)}</HrRow>
                  <HrRow label="Contract ends">{formatDate(hr.contractEndDate)}</HrRow>
                </div>
              ) : null}

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Reports to</p>
                {data.manager ? (
                  <button className="text-left font-medium" onClick={() => onFocus(data.manager!.positionId)}>
                    {data.manager.personName} · {data.manager.title}
                  </button>
                ) : (
                  <p>None (root)</p>
                )}
              </div>
              {data.secondaryManagers.length > 0 ? (
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Dotted line</p>
                  <ul className="mt-1 space-y-1">
                    {data.secondaryManagers.map((item) => (
                      <li key={item.positionId}>
                        <button className="text-left" onClick={() => onFocus(item.positionId)}>
                          {item.personName} · {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                  <Users className="h-3 w-3" /> Direct reports ({data.directReports.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {data.directReports.map((item) => (
                    <li key={item.positionId}>
                      <button className="text-left" onClick={() => onFocus(item.positionId)}>
                        {item.personName} · {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm">
                <span className="text-[var(--muted-foreground)]">Downstream reports:</span> {data.downstreamCount}
              </p>
              {data.otherPositions.length > 0 ? (
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Other seats</p>
                  <ul>
                    {data.otherPositions.map((item) => (
                      <li key={item.positionId}>{item.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                  <GitBranch className="h-3 w-3" /> Reporting chain
                </p>
                <ol className="mt-1 space-y-1">
                  {data.reportingChain.map((item) => (
                    <li key={item.positionId}>
                      <button className="text-left" onClick={() => onFocus(item.positionId)}>
                        {item.personName} · {item.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Source</p>
                {data.provenance.length === 0 ? (
                  <p>Local</p>
                ) : (
                  data.provenance.map((item) => (
                    <p key={`${item.provider}-${item.externalId}`}>
                      {item.provider} · {item.externalId}
                      {item.lastSeenAt ? ` · seen ${formatDate(item.lastSeenAt)}` : ''}
                    </p>
                  ))
                )}
              </div>
            </dl>

            {canEdit ? (
              <div className="mt-6 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => onCreateVacancy(data.position.id)}>
                  Create subordinate vacancy
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
