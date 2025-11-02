import { CouponPublicSelect } from "../../dto/coupon";
import { prisma } from "../../prisma/db";

export const getUserValidCoupons = async (userId: string) => {
  const now = new Date();
  const coupons = await prisma.coupons.findMany({
    where: {
      is_used: false,
      expired_at: { gt: now },
      OR: [
        { claimer_id: userId, user_coupon_role: "CLAIMER" },
        { referrer_id: userId, user_coupon_role: "REFERRER" },
      ],
    },
    select: CouponPublicSelect,
  });

  return coupons;
};
