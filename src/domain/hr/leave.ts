export function mockHolidayBalance(seed: string, allowanceDays = 25): {
  allowanceDays: number;
  remainingDays: number;
} {
  let used = 0;
  for (let i = 0; i < seed.length; i += 1) {
    used = (used + seed.charCodeAt(i) * 13) % 16;
  }
  return {
    allowanceDays,
    remainingDays: Math.max(0, allowanceDays - used),
  };
}

export function tenureLabel(startDate: Date | string | null | undefined, now = new Date()): string | null {
  if (!startDate) return null;
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const months = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} month${rest === 1 ? '' : 's'}`;
  if (rest === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years}y ${rest}m`;
}
