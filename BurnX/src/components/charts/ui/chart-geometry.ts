export type ChartPoint = { x: number; y: number };

export type ChartDomain = {
  min?: number;
  max?: number;
};

export function buildLinePath(
  values: number[],
  width: number,
  height: number,
  padding = 8,
  domain?: ChartDomain,
): { path: string; points: ChartPoint[]; areaPath: string } {
  if (values.length === 0) {
    return { path: "", points: [], areaPath: "" };
  }

  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const max = domain?.max ?? Math.max(...values);
  const min = domain?.min ?? Math.min(...values);
  const span = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? padding + innerW / 2
        : padding + (index / (values.length - 1)) * innerW;
    const normalized = (value - min) / span;
    const y = padding + innerH * (1 - normalized);
    return { x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const baseline = padding + innerH;
  const areaPath = `${path} L ${points[points.length - 1]?.x ?? padding} ${baseline} L ${points[0]?.x ?? padding} ${baseline} Z`;

  return { path, points, areaPath };
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Padded Y domain so nearby scores still read as a line chart, not a flat bar. */
export function resolvePaddedDomain(
  values: number[],
  options?: {
    floor?: number;
    ceiling?: number;
    minSpan?: number;
    pad?: number;
  },
): { min: number; max: number } {
  const floor = options?.floor ?? 30;
  const ceiling = options?.ceiling ?? 80;
  const minSpan = options?.minSpan ?? 12;
  const pad = options?.pad ?? 4;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  let min = dataMin - pad;
  let max = dataMax + pad;

  if (max - min < minSpan) {
    const mid = (dataMin + dataMax) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }

  return {
    min: Math.max(floor, min),
    max: Math.min(ceiling, max),
  };
}
