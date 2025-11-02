export const addTime = (
  date: Date,
  {
    months,
    days,
    hours,
    minutes,
  }: { months?: number; days?: number; hours?: number; minutes?: number }
): Date => {
  const d = new Date(date);
  if (months) d.setMonth(d.getMonth() + months);
  if (days) d.setDate(d.getDate() + days);
  if (hours) d.setHours(d.getHours() + hours);
  if (minutes) d.setMinutes(d.getMinutes() + minutes);
  return d;
};
