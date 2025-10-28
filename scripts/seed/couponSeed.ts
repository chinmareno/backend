import { prisma } from "../../prisma/db";

type CouponSeed = {
  user_id: string;
  other_user_id: string;
};

export const couponSeed = async ({ other_user_id, user_id }: CouponSeed) => {
  await prisma.coupons.create({
    data: {
      user_id,
      other_user_id,
      discount: 10000,
      user_coupon_role: "CLAIMER",
    },
  });
  await prisma.coupons.create({
    data: {
      user_id: other_user_id,
      other_user_id: user_id,
      discount: 10000,
      user_coupon_role: "REFERRER",
    },
  });
};
