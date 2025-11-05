import { z } from "zod";

export const CreateVoucherSchema = z
  .strictObject({
    code: z
      .string()
      .trim()
      .min(3, "Voucher code must be at least 3 characters long")
      .max(50, "Voucher code too long")
      .transform((val) => val.toUpperCase()),

    discount: z.number().int().min(1),

    valid_from: z.coerce.date(),

    valid_until: z.coerce.date(),

    event_id: z.uuid(),

    is_active: z.boolean(),
  })
  .refine((data) => data.valid_until >= data.valid_from, {
    error: "valid_until must be after valid_from",
    path: ["valid_until"],
  });

export const ValidateVoucherSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .max(40)
    .transform((val) => val.toUpperCase()),

  event_id: z.uuid(),
});

export const ToggleActiveVoucherSchema = z.strictObject({
  is_active: z.boolean(),
});
