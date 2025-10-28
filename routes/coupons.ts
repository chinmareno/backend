import express from "express";
import { prisma } from "../prisma/db";
import { CreateCouponSchema } from "../schemas/coupon";
import { timeDif } from "../utils/timeDif";
import { COUPON_EXPIRATION_MONTHS } from "../configs/expiration";
import { AppError } from "../errors/AppError";
import { addMonths } from "../utils/addMonths";
import { isCustomer } from "../middleware/isCustomer";
import * as httpContext from "express-http-context";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const coupons = await prisma.coupons.findMany();

    return res.status(200).json({
      success: true,
      message: "All Coupons fetched successfully.",
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/user/", isCustomer, async (req, res, next) => {
  try {
    const { id: userId } = httpContext.get("user");
    const coupons = await prisma.coupons.findMany({
      where: {
        user_id: userId,
        OR: [
          { transaction: null },
          {
            transaction: {
              status: {
                notIn: ["WAITING_FOR_PAYMENT", "WAITING_FOR_ADMIN", "DONE"],
              },
            },
          },
        ],
      },
    });

    const validCoupons = coupons.filter((c) => {
      const couponAge = timeDif(c.created_at).months;
      const isExpired = couponAge > COUPON_EXPIRATION_MONTHS;
      return !isExpired;
    });

    const validCouponsMapped = validCoupons.map((vc) => {
      const expiredDate = addMonths(vc.created_at, COUPON_EXPIRATION_MONTHS);
      return { ...vc, expiredDate };
    });

    return res.status(200).json({
      success: true,
      message: "User coupons fetched successfully.",
      data: validCouponsMapped,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", isCustomer, async (req, res, next) => {
  try {
    const { success, data, error } = CreateCouponSchema.safeParse(req.body);
    if (!success) {
      throw error;
    }
    const { id: userId } = httpContext.get("user");
    const { referral_code } = data;
    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user) throw new AppError("User not found", 404);

    const isClaimed = await prisma.coupons.findMany({
      where: {
        user_id: userId,
        user_coupon_role: "CLAIMER",
      },
    });

    if (isClaimed.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already claimed a referral code.",
      });
    }

    const referrer = await prisma.users.findUnique({
      where: { referral_code },
    });
    if (!referrer) throw new AppError("Referral code incorrect", 404);
    if (referrer.id === userId)
      throw new AppError(
        "Unfortunately, you cannot use your own referral code.",
        400
      );

    const claimerCoupon = await prisma.$transaction(async (tx) => {
      const claimerCoupon = await tx.coupons.create({
        data: {
          user_id: userId,
          other_user_id: referrer.id,
          discount: 10000,
          user_coupon_role: "CLAIMER",
        },
      });
      await tx.coupons.create({
        data: {
          user_id: referrer.id,
          other_user_id: userId,
          discount: 10000,
          user_coupon_role: "REFERRER",
        },
      });
      return claimerCoupon;
    });

    return res.json({
      success: true,
      message: "Received referral coupon",
      data: claimerCoupon,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
