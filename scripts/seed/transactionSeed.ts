import { prisma } from "../../prisma/db";
import { faker } from "@faker-js/faker";
import { logger } from "../../utils/logger";
import { TRANSACTION_STATUS } from "../../generated/prisma";
import { addTime } from "../../utils/addTime";
import {
  PAYMENT_EXPIRATION_HOURS,
  WAITING_FOR_ADMIN_EXPIRATION_DAYS,
} from "../../configs/expiration";
import { ADMIN_FEE_PERCENTAGE } from "../../configs/adminFee";

export const transactionSeed = async ({
  doneTransactionCount,
  randomTransactionCount,
  pastYearsRange,
}: {
  randomTransactionCount: number;
  doneTransactionCount: number;
  pastYearsRange: number;
}) => {
  const customers = await prisma.users.findMany({
    select: { id: true, username: true },
    where: { role: "CUSTOMER" },
  });
  const events = await prisma.events.findMany({
    select: { id: true, organizer_id: true, price: true },
  });

  if (customers.length === 0 || events.length === 0) {
    logger.error("No customers or events found. Seed them first.");
    return;
  }

  const statusOptions = [
    "CANCELLED",
    "EXPIRED",
    "REJECTED",
    "WAITING_FOR_PAYMENT",
    "WAITING_FOR_ADMIN",
    "DONE",
  ] as TRANSACTION_STATUS[];

  const totalCount = doneTransactionCount + randomTransactionCount;
  const now = new Date();
  const data = Array.from({ length: totalCount }).map((_, i) => {
    const customer = faker.helpers.arrayElement(customers);
    const event = faker.helpers.arrayElement(events);
    let status: TRANSACTION_STATUS;

    if (i < doneTransactionCount) {
      status = "DONE";
    } else {
      status = faker.helpers.arrayElement(statusOptions);
    }

    const createdAt = faker.date.past({ years: pastYearsRange, refDate: now });
    let completedAt: Date | null = null;
    let expiredAt: Date | null = null;
    let adminFee: number | null = null;
    const amountPaid = event.price;

    switch (status) {
      case "WAITING_FOR_PAYMENT":
        if (i < 10) {
          expiredAt = new Date(addTime(now, { minutes: 1 }));
        } else {
          expiredAt = new Date(
            addTime(now, { hours: PAYMENT_EXPIRATION_HOURS })
          );
        }
        break;
      case "WAITING_FOR_ADMIN":
        if (i < 10) {
          expiredAt = new Date(addTime(now, { minutes: 1 }));
        } else {
          expiredAt = addTime(now, {
            days: WAITING_FOR_ADMIN_EXPIRATION_DAYS,
            hours: 1, // User took 1hour to make payment
          });
        }
        break;
      case "DONE":
        completedAt = faker.date.between({
          from: createdAt,
          to: addTime(createdAt, { days: WAITING_FOR_ADMIN_EXPIRATION_DAYS }),
        });
        expiredAt = null;
        adminFee = Math.ceil(event.price * (ADMIN_FEE_PERCENTAGE / 100));
        break;
      case "CANCELLED":
      case "REJECTED":
        expiredAt = faker.date.between({
          from: createdAt,
          to: addTime(createdAt, {
            days: WAITING_FOR_ADMIN_EXPIRATION_DAYS,
            hours: 1, // User took 1hour to make payment
          }),
        });
        break;
      case "EXPIRED":
        expiredAt = addTime(createdAt, {
          days: WAITING_FOR_ADMIN_EXPIRATION_DAYS,
        });
        break;
    }

    return {
      id: faker.string.uuid(),
      event_id: event.id,
      customer_id: customer.id,
      organizer_id: event.organizer_id,
      customer_name: customer.username,
      amount_paid: amountPaid,
      status,
      created_at: createdAt,
      completed_at: completedAt,
      expired_at: expiredAt,
      admin_fee_amount: adminFee ? adminFee : undefined,
      admin_fee_percentage: ADMIN_FEE_PERCENTAGE,
    };
  });

  await prisma.transactions.createMany({ data });
  logger.info(`Seeded ${totalCount} transactions`);
};
