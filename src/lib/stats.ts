import { statusKey, type StatusKey } from "@/lib/media";

export interface MediaStats {
  total: number;
  count: (status: StatusKey) => number;
  percentage: (status: StatusKey) => number;
}

// Mirrors MediaItemStats: counts grouped by status, with percentage of total.
export function computeStats(items: { status: number }[]): MediaStats {
  const counts: Partial<Record<StatusKey, number>> = {};
  for (const item of items) {
    const key = statusKey(item.status);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const total = items.length;

  return {
    total,
    count: (status) => counts[status] ?? 0,
    percentage: (status) =>
      total === 0 ? 0 : Math.round(((counts[status] ?? 0) / total) * 100),
  };
}
