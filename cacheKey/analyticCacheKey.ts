type Params = {
  role: "organizer" | "admin";
  year?: number;
  month?: number;
};

export const analyticCacheKey = ({ role, year, month }: Params) =>
  `analytics/organizer/${role}/${year ?? 0}/${month ?? 0}`;
