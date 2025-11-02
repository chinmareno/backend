import { prisma } from "../../../prisma/db";
import { faker } from "@faker-js/faker";
import { logger } from "../../../utils/logger";

export const transactionCouponDiscountSeed = async ({
  applyChancePercentage,
}: {
  applyChancePercentage: number;
}) => {
  if (applyChancePercentage < 0 || applyChancePercentage > 100) {
    logger.error(
      `Invalid applyChancePercentage: ${applyChancePercentage}%. Must be between 0 and 100.`
    );
    return;
  }

  const transactions = await prisma.transactions.findMany({
    select: { id: true, amount_paid: true },
  });

  if (transactions.length === 0) {
    logger.error("No transactions found. Run transactionSeed first.");
    return;
  }

  let appliedTransactionCount = 0;

  await Promise.all(
    transactions.map((tx) => {
      const applyCoupon =
        faker.number.int({ min: 1, max: 100 }) <= applyChancePercentage;

      if (applyCoupon) {
        const couponDiscount = faker.number.int({
          min: 0,
          max: tx.amount_paid / 5,
        });
        if (couponDiscount === 0) return;

        const finalAmount = tx.amount_paid - couponDiscount;
        appliedTransactionCount++;

        return prisma.transactions.update({
          where: { id: tx.id },
          data: {
            coupon_discount: couponDiscount,
            amount_paid: finalAmount,
          },
        });
      }
    })
  );

  logger.info(
    `Applied coupon discounts to ${appliedTransactionCount} transactions`
  );
};
