'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PositionNode } from '@/components/chart/position-node';
import { layoutChart } from '@/components/chart/layout';
import { ChartToolbar, filterQuery } from '@/components/chart/chart-toolbar';
import { ChartLegend } from '@/components/chart/chart-legend';
import { DetailsDrawer } from '@/components/chart/details-drawer';
import { FacesView } from '@/components/chart/faces-view';
import { DirectoryView, GridView } from '@/components/chart/roster-views';
import { parseChartSurface, type ChartSurface } from '@/components/chart/chart-surface';
import { ShareDialog } from '@/components/chart/share-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChartFilter } from '@/domain/org/types';
import type { ChartEdgeModel, ChartNodeModel } from '@/domain/chart/project';
import { reportingLineageIds } from '@/domain/chart/spotlight';

const nodeTypes = { position: PositionNode };

interface GraphResponse {
  nodes: ChartNodeModel[];
  edges: ChartEdgeModel[];
  departments: Array<{ id: string; name: string; colour: string | null }>;
  locations: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; kind: string; colour: string | null }>;
  totals: { positions: number; rendered: number; vacant: number };
  chart: { name: string } | null;
  scenario: { id: string; name: string } | null;
}

interface ScenarioRow {
  id: string;
  name: string;
  changeCount: number;
}

function ChartInner({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const flow = useReactFlow();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ChartFilter>(() => {
    const groupIds = searchParams.get('groupIds')?.split(',').filter(Boolean);
    const departmentIds = searchParams.get('departmentIds')?.split(',').filter(Boolean);
    return {
      ...(groupIds?.length ? { groupIds } : {}),
      ...(departmentIds?.length ? { departmentIds } : {}),
    };
  });
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [layout, setLayout] = useState<'TOP_DOWN' | 'LEFT_RIGHT'>('TOP_DOWN');
  const [mode, setMode] = useState<'LIVE' | 'PLANNING'>(
    searchParams.get('scenario') ? 'PLANNING' : 'LIVE',
  );
  const [scenarioId, setScenarioId] = useState<string | null>(searchParams.get('scenario'));
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('focus'));
  const [focus, setFocus] = useState<string | null>(searchParams.get('focus'));
  const [surface, setSurface] = useState<ChartSurface>(parseChartSurface(searchParams.get('view')));
  const [spotlight, setSpotlight] = useState(false);
  const [rosterQuery, setRosterQuery] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);
  const [vacancyFor, setVacancyFor] = useState<string | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState('New role');
  const canEdit = role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR';
  const canShare = role === 'OWNER' || role === 'ADMIN';
  const fitOnce = useRef(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const lastRevision = useRef<string | null>(null);

  useEffect(() => {
    setCanvasReady(true);
  }, []);

  const query = filterQuery(filters);
  const { data: scenarioData } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await fetch('/api/v1/scenarios');
      if (!response.ok) throw new Error('Failed to load scenarios');
      return (await response.json()) as { scenarios: ScenarioRow[] };
    },
  });
  const scenarios = scenarioData?.scenarios ?? [];

  const persistScenario = (nextMode: 'LIVE' | 'PLANNING', nextScenarioId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === 'PLANNING' && nextScenarioId) params.set('scenario', nextScenarioId);
    else params.delete('scenario');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (mode !== 'PLANNING' || scenarioId || scenarios.length === 0) return;
    const id = scenarios[0]!.id;
    setScenarioId(id);
    persistScenario('PLANNING', id);
  }, [mode, scenarioId, scenarios]);

  const { data, isLoading } = useQuery({
    queryKey: ['chart-graph', query, collapsed.join(','), focus, mode === 'PLANNING' ? scenarioId : null],
    queryFn: async () => {
      const params = new URLSearchParams(query);
      if (collapsed.length) params.set('collapsed', collapsed.join(','));
      if (focus) params.set('focus', focus);
      if (mode === 'PLANNING' && scenarioId) params.set('scenarioId', scenarioId);
      const response = await fetch(`/api/v1/charts/current/graph?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load chart');
      return (await response.json()) as GraphResponse;
    },
    enabled: mode !== 'PLANNING' || Boolean(scenarioId),
  });

  const { data: presence } = useQuery({
    queryKey: ['chart-presence', selectedId],
    queryFn: async () => {
      const response = await fetch('/api/v1/charts/presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ focusPositionId: selectedId }),
      });
      if (!response.ok) throw new Error('Failed to update presence');
      return (await response.json()) as {
        viewers: Array<{ userId: string; name: string; focusPositionId: string | null }>;
        revision: string | null;
      };
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!presence?.revision) return;
    if (lastRevision.current && lastRevision.current !== presence.revision) {
      queryClient.invalidateQueries({ queryKey: ['chart-graph'] });
      toast.message('Someone else changed the organisation. Reloaded the latest seats.');
    }
    lastRevision.current = presence.revision;
  }, [presence?.revision, queryClient]);

  useEffect(() => {
    if (!data || surface !== 'hierarchy') return;
    let cancelled = false;
    layoutChart(data.nodes, data.edges, layout).then((laid) => {
      if (cancelled) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
      if (focus) {
        requestAnimationFrame(() => {
          flow.setCenter(
            (laid.nodes.find((node) => node.id === focus)?.position.x ?? 0) + 134,
            (laid.nodes.find((node) => node.id === focus)?.position.y ?? 0) + 66,
            { zoom: 1.1, duration: 400 },
          );
        });
      } else if (!fitOnce.current) {
        fitOnce.current = true;
        requestAnimationFrame(() => flow.fitView({ padding: 0.12, duration: 300 }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, layout, flow, focus, surface]);

  const lineage = useMemo(() => {
    if (!spotlight || !selectedId || !data) return null;
    return reportingLineageIds(data.edges, selectedId);
  }, [data, selectedId, spotlight]);

  const reparent = useMutation({
    mutationFn: async (body: { subordinatePositionId: string; managerPositionId: string }) => {
      const response = await fetch('/api/v1/relationships/reparent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...body,
          mode,
          scenarioId: mode === 'PLANNING' ? scenarioId ?? undefined : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Reparent failed');
      return payload;
    },
    onSuccess: () => {
      toast.success(mode === 'LIVE' ? 'Reporting line updated' : 'Recorded on the scenario');
      queryClient.invalidateQueries({ queryKey: ['chart-graph'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createVacancy = useMutation({
    mutationFn: async (body: { title: string; managerPositionId: string }) => {
      const response = await fetch('/api/v1/positions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...body,
          mode,
          scenarioId: mode === 'PLANNING' ? scenarioId ?? undefined : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Could not create vacancy');
      return payload;
    },
    onSuccess: () => {
      toast.success(mode === 'PLANNING' ? 'Planned vacancy added' : 'Vacancy created');
      setVacancyFor(null);
      queryClient.invalidateQueries({ queryKey: ['chart-graph'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const onNodeDoubleClick = useCallback((_: unknown, node: Node) => {
    setCollapsed((current) =>
      current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id],
    );
  }, []);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (!canEdit) return;
      const intersecting = flow.getIntersectingNodes(node).filter((item) => item.id !== node.id);
      const target = intersecting[0];
      if (target) {
        setPendingMove({ from: node.id, to: target.id });
      }
    },
    [canEdit, flow],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!selectedId || !data) return;
      if (!event.key.startsWith('Arrow')) return;
      const parentEdge = data.edges.find(
        (edge) => edge.target === selectedId && edge.kind === 'PRIMARY',
      );
      const childEdge = data.edges.find(
        (edge) => edge.source === selectedId && edge.kind === 'PRIMARY',
      );
      if (event.key === 'ArrowUp' && parentEdge) {
        setSelectedId(parentEdge.source);
        setFocus(parentEdge.source);
      }
      if (event.key === 'ArrowDown' && childEdge) {
        setSelectedId(childEdge.target);
        setFocus(childEdge.target);
      }
    },
    [data, selectedId],
  );

  const persistView = (next: ChartSurface) => {
    setSurface(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'hierarchy') params.delete('view');
    else params.set('view', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const displayedNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedId,
    style: {
      ...node.style,
      opacity: lineage && !lineage.has(node.id) ? 0.22 : 1,
    },
  }));

  return (
    <div className="flex h-full flex-col bg-transparent print-chart" onKeyDown={onKeyDown}>
      <div className="flex items-end justify-between px-4 pt-4 pb-1">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
            {data?.chart?.name ?? 'Organisation chart'}
          </p>
          <p className="mt-0.5 text-sm text-[var(--foreground)]">
            {data
              ? `${data.totals.positions} seats · ${data.totals.positions - data.totals.vacant} filled · ${data.totals.vacant} open`
              : 'Opening chart…'}
            {mode === 'PLANNING' ? ` · Planning overlay${data?.scenario?.name ? ` · ${data.scenario.name}` : ''}` : ''}
            {spotlight && selectedId ? ' · Spotlight on' : ''}
            {presence?.viewers.length
              ? ` · ${presence.viewers.map((viewer) => viewer.name).join(', ')} also viewing`
              : ''}
          </p>
        </div>
      </div>
      <ChartToolbar
        departments={data?.departments ?? []}
        locations={data?.locations ?? []}
        groups={data?.groups ?? []}
        filters={filters}
        onFilters={setFilters}
        onSearchSelect={(id) => {
          setFocus(id);
          setSelectedId(id);
          persistView('hierarchy');
        }}
        layout={layout}
        onLayout={setLayout}
        mode={mode}
        onMode={(next) => {
          setMode(next);
          persistScenario(next, next === 'PLANNING' ? scenarioId : null);
        }}
        canEdit={canEdit}
        onFit={() => flow.fitView({ padding: 0.12, duration: 250 })}
        surface={surface}
        onSurface={persistView}
        spotlight={spotlight}
        onSpotlight={setSpotlight}
        onPrint={() => {
          if (surface === 'hierarchy') {
            flow.fitView({ padding: 0.08, duration: 200 });
            window.setTimeout(() => window.print(), 350);
          } else {
            window.print();
          }
        }}
        onExport={(format) => {
          window.location.href = `/api/v1/exports/directory?format=${format}`;
        }}
        onShare={() => setShareOpen(true)}
        rosterQuery={rosterQuery}
        onRosterQuery={setRosterQuery}
        scenarios={scenarios}
        scenarioId={scenarioId}
        onScenario={(id) => {
          setScenarioId(id);
          persistScenario('PLANNING', id);
        }}
        canShare={canShare}
      />
      <div className="canvas-grid relative min-h-0 flex-1">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
            Laying out organisation…
          </div>
        ) : null}
        {surface === 'hierarchy' && canvasReady ? (
          <>
            <ReactFlow
              nodes={displayedNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onNodeDragStop={onNodeDragStop}
              minZoom={0.15}
              maxZoom={1.6}
              onlyRenderVisibleElements
              proOptions={{ hideAttribution: true }}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.15} color="rgba(47, 93, 98, 0.16)" />
              <MiniMap pannable zoomable maskColor="rgba(246, 244, 239, 0.7)" />
              <Controls showInteractive={false} />
            </ReactFlow>
            <ChartLegend />
          </>
        ) : null}
        {surface === 'faces' && data ? (
          <FacesView
            nodes={data.nodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={rosterQuery}
          />
        ) : null}
        {surface === 'directory' && data ? (
          <DirectoryView
            nodes={data.nodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={rosterQuery}
          />
        ) : null}
        {surface === 'grid' && data ? (
          <GridView
            nodes={data.nodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={rosterQuery}
          />
        ) : null}
      </div>

      <DetailsDrawer
        positionId={selectedId}
        scenarioId={mode === 'PLANNING' ? scenarioId : null}
        onClose={() => setSelectedId(null)}
        onFocus={(id) => {
          setFocus(id);
          setSelectedId(id);
        }}
        canEdit={canEdit}
        onCreateVacancy={setVacancyFor}
      />

      <Dialog open={Boolean(pendingMove)} onOpenChange={(open) => !open && setPendingMove(null)}>
        <DialogContent>
          <DialogTitle>Move position?</DialogTitle>
          <DialogDescription>
            {mode === 'LIVE'
              ? 'This updates the live reporting line, writes an audit event, and does not push to Microsoft.'
              : 'This records a scenario change only. Live organisation data is not modified.'}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingMove) return;
                reparent.mutate({
                  subordinatePositionId: pendingMove.from,
                  managerPositionId: pendingMove.to,
                });
                setPendingMove(null);
              }}
            >
              Confirm move
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vacancyFor)} onOpenChange={(open) => !open && setVacancyFor(null)}>
        <DialogContent>
          <DialogTitle>Create vacancy</DialogTitle>
          <DialogDescription>
            {mode === 'PLANNING'
              ? 'Adds a planned open role on this scenario. Live seats are not created.'
              : 'Adds an unoccupied position reporting to the selected seat.'}
          </DialogDescription>
          <Input className="mt-3" value={vacancyTitle} onChange={(event) => setVacancyTitle(event.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVacancyFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!vacancyFor) return;
                createVacancy.mutate({ title: vacancyTitle, managerPositionId: vacancyFor });
              }}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

export function OrgChart({ role }: { role: string }) {
  return (
    <ReactFlowProvider>
      <ChartInner role={role} />
    </ReactFlowProvider>
  );
}
