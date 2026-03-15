/**
 * Analytics Calculation Utilities
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: string): DateRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "quarter":
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case "year":
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "all":
      start = new Date(0);
      break;
    default:
      // Default to last 30 days
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function groupByDate(
  items: Array<{ date: Date; value: number }>,
  granularity: "day" | "week" | "month" = "day"
): Array<{ date: string; value: number }> {
  const groups = new Map<string, number>();

  for (const item of items) {
    let key: string;

    switch (granularity) {
      case "day":
        key = item.date.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(item.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    groups.set(key, (groups.get(key) || 0) + item.value);
  }

  return Array.from(groups.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function fillMissingDates(
  data: Array<{ date: string; value: number }>,
  startDate: Date,
  endDate: Date
): Array<{ date: string; value: number }> {
  const dataMap = new Map(data.map((d) => [d.date, d.value]));
  const result: Array<{ date: string; value: number }> = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      value: dataMap.get(dateStr) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export function calculateGrowthRate(
  currentPeriod: number[],
  previousPeriod: number[]
): number {
  const currentSum = currentPeriod.reduce((a, b) => a + b, 0);
  const previousSum = previousPeriod.reduce((a, b) => a + b, 0);
  return calculatePercentageChange(currentSum, previousSum);
}
