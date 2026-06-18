/**
 * Pure helpers that build human-readable text summaries of chart data.
 *
 * The summaries are rendered into a visually-hidden element and programmatically
 * associated with each chart so assistive technologies can convey the chart's
 * data values and overall trend without relying on the canvas visual
 * (Requirement 14.3).
 */

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Summarizes a status/stage breakdown (doughnut). States the total, the
 * per-stage values, and which stage is most common (the "trend" of the
 * distribution).
 */
export function summarizeStatusBreakdown(
  data: { stage: string; count: number }[]
): string {
  if (data.length === 0) {
    return "Status breakdown chart. No applications to display.";
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const parts = data.map((d) => `${capitalize(d.stage)}: ${d.count}`);

  if (total === 0) {
    return `Status breakdown chart. ${parts.join(", ")}. No applications recorded.`;
  }

  const top = data.reduce((best, d) => (d.count > best.count ? d : best), data[0]);
  const pct = Math.round((top.count / total) * 100);

  return (
    `Status breakdown chart of ${total} application${total === 1 ? "" : "s"} by stage. ` +
    `${parts.join(", ")}. ` +
    `Most applications are in the ${capitalize(top.stage)} stage (${top.count}, ${pct}%).`
  );
}

/**
 * Summarizes an applications-over-time series (line). States the range, the
 * per-period values, the total, and the overall trend (rising, falling, or
 * steady) based on the first and last data points.
 */
export function summarizeApplicationsOverTime(
  data: { date: string; count: number }[]
): string {
  if (data.length === 0) {
    return "Applications over time chart. No data to display.";
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const parts = data.map((d) => `${d.date}: ${d.count}`);

  let trend: string;
  if (data.length === 1) {
    trend = `A single period with ${data[0].count} application${data[0].count === 1 ? "" : "s"}.`;
  } else {
    const first = data[0].count;
    const last = data[data.length - 1].count;
    const direction =
      last > first ? "rising" : last < first ? "falling" : "steady";
    trend =
      `Overall trend is ${direction} from ${first} on ${data[0].date} ` +
      `to ${last} on ${data[data.length - 1].date}.`;
  }

  return (
    `Applications over time chart spanning ${data.length} ` +
    `period${data.length === 1 ? "" : "s"}, ${total} application${total === 1 ? "" : "s"} total. ` +
    `${parts.join(", ")}. ${trend}`
  );
}
