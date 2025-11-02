import { prisma } from "../../../prisma/db";
import { faker } from "@faker-js/faker";
import { logger } from "../../../utils/logger";

export const transactionPayAdminFeeSeed = async ({
  applyChancePercentage,
}: {
  applyChancePercentage: number;
  minFee?: number;
  maxFee?: number;
}) => {
  if (applyChancePercentage < 0 || applyChancePercentage > 100) {
    logger.error(
      `Invalid applyChancePercentage: ${applyChancePercentage}%. Must be between 0 and 100.`
    );
    return;
  }

  const transactions = await prisma.transactions.findMany({
    select: {
      id: true,
    },
    where: { is_admin_fee_paid: false, status: "DONE" },
  });

  if (transactions.length === 0) {
    logger.error("No transactions found. Run transactionSeed first.");
    return;
  }

  let appliedTransactionCount = 0;

  const now = new Date();

  await Promise.all(
    transactions.map((tx) => {
      const payAdminFee =
        faker.number.int({ min: 1, max: 100 }) <= applyChancePercentage;

      if (payAdminFee) {
        appliedTransactionCount++;

        return prisma.transactions.update({
          where: { id: tx.id },
          data: { is_admin_fee_paid: true, admin_fee_paid_at: now },
        });
      }
    })
  );

  logger.info(`Paying admin fees for ${appliedTransactionCount} transactions`);
};
