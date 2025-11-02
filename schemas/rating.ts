import { z } from "zod";

export const CreateRatingSchema = z.strictObject({
  event_id: z.uuid("Invalid event ID format"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  description: z.string().max(1000, "Description is too long").optional(),
});

export const EditRatingSchema = z.strictObject({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  description: z.string().max(1000, "Description is too long").optional(),
});

export const QueryRatingSchema = z.strictObject({
  event_id: z.uuid("Invalid event ID format"),
});
