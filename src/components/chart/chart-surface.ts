export type ChartSurface = 'hierarchy' | 'faces' | 'directory' | 'grid';

export function parseChartSurface(value: string | null): ChartSurface {
  if (value === 'faces' || value === 'directory' || value === 'grid') return value;
  return 'hierarchy';
}
