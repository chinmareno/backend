import { COUPON_EXPIRATION_MONTHS } from "../../configs/expiration";
import { prisma } from "../../prisma/db";
import { addTime } from "../../utils/addTime";

type CouponSeed = {
  claimer_id: string;
  referrer_id: string;
};

export const couponSeed = async ({ referrer_id, claimer_id }: CouponSeed) => {
  const now = new Date();
  const expiryDate = addTime(now, { months: COUPON_EXPIRATION_MONTHS });

  // Someone already claim ur referral meaning you cannot claim referral coupon anymore cause you're not a new user
  const isRegistered = await prisma.coupons.findFirst({
    where: { referrer_id: claimer_id, user_coupon_role: "CLAIMER" },
  });
  if (isRegistered) return;

  await prisma.coupons.createMany({
    data: [
      {
        claimer_id,
        referrer_id,
        discount: 10000,
        user_coupon_role: "CLAIMER",
        expired_at: expiryDate,
      },
      {
        claimer_id,
        referrer_id,
        discount: 10000,
        user_coupon_role: "REFERRER",
        expired_at: expiryDate,
      },
    ],
  });
};
