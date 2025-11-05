import { z } from "zod";
import { TRANSACTION_STATUS } from "../generated/prisma";

export const CreateTransactionSchema = z.strictObject({
  event_id: z.uuid("Invalid event ID format"),

  voucher_id: z.uuid("Invalid voucher ID format").optional(),

  coupon_ids: z.uuid("Invalid coupon ID format").array(),
});

export const CompleteTransactionSchema = z.strictObject({
  payment_proof_url: z.string().min(1, "Payment proof URL is required"),
});

export const QueryTransactionSchema = z.strictObject({
  status: z
    .string()
    .optional()
    .transform((val) => val && val.split(","))
    .pipe(z.enum(TRANSACTION_STATUS).array().optional()),

  event_id: z.uuid().optional(),
});
