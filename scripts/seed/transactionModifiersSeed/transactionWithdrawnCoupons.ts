import { faker } from "@faker-js/faker";
import { prisma } from "../../../prisma/db";
import { logger } from "../../../utils/logger";

export const transactionWithdrawnCoupons = async ({
  applyChancePercentage,
}: {
  applyChancePercentage: number;
}) => {
  if (applyChancePercentage < 0 || applyChancePercentage > 100) {
    logger.error(
      `Invalid applyChancePercentage: ${applyChancePercentage}. Must be between 0 and 100.`
    );
    return;
  }
  const now = new Date();
  const transactions = await prisma.transactions.findMany({
    where: {
      is_coupon_withdrawn: false,
      coupon_discount: { gt: 0 },
      status: "DONE",
      AND: [{ completed_at: { not: null, lt: now } }],
    },
  });

  let appliedTransactionCount = 0;

  await Promise.all(
    transactions.map((tx) => {
      const withdrawCoupon =
        faker.number.int({ min: 1, max: 100 }) <= applyChancePercentage;

      if (withdrawCoupon) {
        appliedTransactionCount++;
        if (!tx.completed_at) return console.log(tx.completed_at);
        if (tx.completed_at > now) return console.log(tx.completed_at);
        const withdrawnAt = faker.date.between({
          from: tx.completed_at,
          to: now,
        });
        return prisma.transactions.update({
          where: { id: tx.id },
          data: {
            is_coupon_withdrawn: true,
            coupon_withdrawn_at: withdrawnAt,
          },
        });
      }
    })
  );

  logger.info(
    `Withdrawn coupon discounts from ${appliedTransactionCount} transactions`
  );
};
