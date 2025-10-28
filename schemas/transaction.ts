import { z } from "zod";

export const CreateTransactionSchema = z.strictObject({
  event_id: z.uuid("Invalid event ID format"),

  voucher_id: z.uuid("Invalid voucher ID format").optional(),

  coupon_ids: z.uuid("Invalid coupon ID format").array(),
});

export const CompleteTransactionSchema = z.strictObject({
  payment_proof_url: z.string().min(1, "Payment proof URL is required"),
});
