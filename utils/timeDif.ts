export const timeDif = (target: Date) => {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const seconds = absMs / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const months = days / 30;

  return {
    ms: absMs,
    seconds,
    minutes,
    hours,
    days,
    months,
    isPassed: diffMs < 0,
  };
};
