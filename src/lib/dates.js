export const toDate = (v) => {
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (v == null || v === '') return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

export const toTime = (v) => toDate(v)?.getTime() ?? 0;
