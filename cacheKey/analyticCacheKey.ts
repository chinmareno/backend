export const analyticPeriodCacheKey = ({
  role,
  year,
  month,
}: {
  role: "organizer" | "admin";
  year?: number;
  month?: number;
}) => `analytics/organizer/${role}/${year ?? 0}/${month ?? 0}`;

export const analyticEventCacheKey = (eventId: string) =>
  `analytics/organizer/event/${eventId}}`;
