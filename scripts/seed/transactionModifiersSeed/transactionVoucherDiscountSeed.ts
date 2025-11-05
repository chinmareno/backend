import { prisma } from "../../../prisma/db";
import { faker } from "@faker-js/faker";
import { logger } from "../../../utils/logger";
import { ADMIN_FEE_PERCENTAGE } from "../../../configs/adminFee";

export const transactionVoucherDiscountSeed = async ({
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

  const transactions = await prisma.transactions.findMany({
    select: {
      id: true,
      amount_paid: true,
      event: { select: { price: true } },
    },
    where: { status: "DONE" },
  });

  if (transactions.length === 0) {
    logger.error("No transactions found. Run transactionSeed first.");
    return;
  }

  let appliedTransactionCount = 0;

  await Promise.all(
    transactions.map((tx) => {
      const applyVoucher =
        faker.number.int({ min: 1, max: 100 }) <= applyChancePercentage;

      if (applyVoucher) {
        const voucherDiscount = faker.number.int({
          min: 0,
          max: tx.amount_paid / 2,
        });
        if (voucherDiscount === 0) return;
        const finalAmount = tx.amount_paid - voucherDiscount;
        appliedTransactionCount++;

        const organizerNetRevenue = tx.event.price - voucherDiscount;
        const adminFee = organizerNetRevenue * (ADMIN_FEE_PERCENTAGE / 100);
        return prisma.transactions.update({
          where: { id: tx.id },
          data: {
            voucher_discount: voucherDiscount,
            amount_paid: finalAmount,
            admin_fee_amount: adminFee,
            admin_fee_percentage: ADMIN_FEE_PERCENTAGE,
          },
        });
      }
    })
  );

  logger.info(
    `Applied voucher discounts to ${appliedTransactionCount} transactions`
  );
};
