// Preset "how long before the goal is due" options used for template steps,
// since a template is reused across many different goal due dates.
export const OFFSET_OPTIONS = [
  { days: 60, label: '2 months before' },
  { days: 30, label: '1 month before' },
  { days: 21, label: '3 weeks before' },
  { days: 14, label: '2 weeks before' },
  { days: 7, label: '1 week before' },
  { days: 1, label: '1 day before' },
  { days: 0, label: 'On the day' },
];

export const offsetLabel = (days) => {
  if (days === null || days === undefined) return '';
  const match = OFFSET_OPTIONS.find(o => o.days === days);
  if (match) return match.label;
  return days === 1 ? '1 day before' : `${days} days before`;
};

// goalDueDate/stepDueDate accepted as Date, ISO string, or "YYYY-MM-DD".
export const dateFromOffset = (goalDueDate, offsetDays) => {
  if (!goalDueDate || offsetDays === null || offsetDays === undefined) return null;
  const d = new Date(goalDueDate);
  d.setDate(d.getDate() - offsetDays);
  return d;
};

export const offsetFromDates = (goalDueDate, stepDueDate) => {
  if (!goalDueDate || !stepDueDate) return null;
  const goal = new Date(goalDueDate);
  const step = new Date(stepDueDate);
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round((goal.getTime() - step.getTime()) / DAY_MS);
};
