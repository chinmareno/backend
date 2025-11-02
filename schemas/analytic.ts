import { z } from "zod";

export const QueryAnalyticSchema = z
  .strictObject({
    year: z.coerce
      .number()
      .int("Year must be an integer")
      .min(2000, "Year is too early")
      .max(2100, "Year is too far in the future")
      .optional(),
    month: z.coerce
      .number()
      .int("Month must be an integer")
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.month !== undefined && data.year === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Month cannot be provided without a year",
        path: ["month"],
      });
    }
  });
