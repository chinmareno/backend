type Params = {
  role: "customer" | "organizer";
  eventId: string;
};

export const ratingCacheKey = ({ eventId, role }: Params) =>
  `ratings/${role}/${eventId}`;
