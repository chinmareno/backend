import express from "express";
import { prisma } from "../prisma/db";
import { CreateCouponSchema } from "../schemas/coupon";
import { isCustomer } from "../middleware/isCustomer";
import * as httpContext from "express-http-context";
import { getUserValidCoupons } from "../services/coupons/getUserValidCoupons";
import { claimReferralCoupon } from "../services/coupons/claimReferralCoupon";

const router = express.Router();

// TODO DELETE WHEN DONE
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

    const coupons = await getUserValidCoupons(userId);

    return res.status(200).json({
      success: true,
      message: "User coupons fetched successfully.",
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", isCustomer, async (req, res, next) => {
  try {
    const { success, data, error } = CreateCouponSchema.safeParse(req.body);
    if (!success) throw error;

    const { id: userId } = httpContext.get("user");

    const { referral_code } = data;

    const claimerCoupon = await claimReferralCoupon({
      claimer_id: userId,
      referral_code,
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
