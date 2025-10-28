import { z } from "zod";

export const CreateCouponSchema = z.strictObject({
  referral_code: z.string(),
});

export const QueryCouponSchema = z.strictObject({
  user_id: z.uuid().optional(),
});
