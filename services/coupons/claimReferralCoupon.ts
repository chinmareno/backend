import { COUPON_EXPIRATION_MONTHS } from "../../configs/expiration";
import { CouponPublicSelect } from "../../dto/coupon";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../prisma/db";
import { addTime } from "../../utils/addTime";

type Params = {
  claimer_id: string;
  referral_code: string;
};

export const claimReferralCoupon = async ({
  claimer_id,
  referral_code,
}: Params) => {
  const isClaimed = await prisma.coupons.findFirst({
    where: {
      claimer_id,
      user_coupon_role: "CLAIMER",
    },
    select: { id: true },
  });
  if (isClaimed) {
    throw new AppError("You have already claimed a referral code.", 400);
  }

  const referrer = await prisma.users.findUnique({
    where: { referral_code },
    select: { id: true },
  });
  if (!referrer) {
    throw new AppError("Referral code incorrect", 404);
  }
  if (referrer.id === claimer_id) {
    throw new AppError(
      "Unfortunately, you cannot use your own referral code.",
      400
    );
  }

  const couponExpiredData = addTime(new Date(), {
    months: COUPON_EXPIRATION_MONTHS,
  });
  const claimerCoupon = await prisma.$transaction(async (tx) => {
    const claimerCoupon = await tx.coupons.create({
      data: {
        claimer_id,
        referrer_id: referrer.id,
        discount: 10000,
        user_coupon_role: "CLAIMER",
        expired_at: couponExpiredData,
      },
      select: CouponPublicSelect,
    });
    await tx.coupons.create({
      data: {
        claimer_id,
        referrer_id: referrer.id,
        discount: 10000,
        user_coupon_role: "REFERRER",
        expired_at: couponExpiredData,
      },
      select: { id: true },
    });
    return claimerCoupon;
  });

  return claimerCoupon;
};
