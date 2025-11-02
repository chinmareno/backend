import { z } from "zod";
import { CATEGORY } from "../generated/prisma";
import { LOCATION } from "../generated/prisma";

export const CreateEventSchema = z
  .strictObject({
    name: z
      .string()
      .min(3, "Event name must be at least 3 characters long")
      .max(100, "Event name must be less than 100 characters"),

    price: z.number().int("Price must be an integer"),

    start_date: z.coerce.date("Start date must be a valid date string"),

    end_date: z.coerce.date("End date must be a valid date string"),

    capacity_seat: z
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1")
      .max(32767, "Capacity too large"),

    description: z.string().max(2000, "Description is too long").optional(),

    location: z.enum(LOCATION),

    category: z.enum(CATEGORY).array().min(1, "At least one category required"),
  })

  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    error: "End date must be after start date",
    path: ["end_date"],
  });

export const EditEventSchema = z.strictObject({
  name: z
    .string()
    .min(3, "Event name must be at least 3 characters long")
    .max(100, "Event name must be less than 100 characters"),

  capacity_seat: z
    .number()
    .int("Capacity must be an integer")
    .min(1, "Capacity must be at least 1")
    .max(32767, "Capacity too large"),

  description: z.string().max(2000, "Description is too long").optional(),
});

export const QueryEventSchema = z.strictObject({
  category: z
    .string()
    .optional()
    .transform((val) => val && val.split(","))
    .pipe(z.enum(CATEGORY).array().optional()),

  location: z.enum(LOCATION).optional(),

  is_free: z
    .literal("true")
    .optional()
    .transform((val) => (val === "true" ? true : undefined)),

  search: z.string().optional(),

  last_event_Id: z.uuid().optional(),

  userId: z.string().optional(),

  status: z.enum([
    "AVAILABLE",
    "UNPAID",
    "ORDERED",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
  ]),
});
