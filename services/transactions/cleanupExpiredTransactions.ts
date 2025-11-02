import { prisma } from "../../prisma/db";

type CleanupExpiredTransactionsParams = {
  id?: string;
  eventId?: string;
  userId?: string;
};

export const cleanupExpiredTransactions = async ({
  id,
  eventId,
  userId,
}: CleanupExpiredTransactionsParams) => {
  const now = new Date();
  const expiredTransactions = await prisma.transactions.findMany({
    where: {
      id,
      event_id: eventId,
      customer_id: userId,
      expired_at: { lt: now },
      OR: [{ status: "WAITING_FOR_PAYMENT" }, { status: "WAITING_FOR_ADMIN" }],
    },
    select: { id: true, status: true },
  });

  const waitingPaymentExpiredIds: string[] = [];
  const waitingAdminExpiredIds: string[] = [];

  expiredTransactions.forEach((t) => {
    if (t.status === "WAITING_FOR_PAYMENT") waitingPaymentExpiredIds.push(t.id);
    else if (t.status === "WAITING_FOR_ADMIN")
      waitingAdminExpiredIds.push(t.id);
  });

  if (!waitingPaymentExpiredIds.length && !waitingAdminExpiredIds.length)
    return { freedSeats: 0 };

  await prisma.$transaction(async (tx) => {
    if (waitingPaymentExpiredIds.length > 0) {
      await tx.transactions.updateMany({
        where: {
          id: { in: waitingPaymentExpiredIds },
          status: "WAITING_FOR_PAYMENT",
        },
        data: { status: "EXPIRED" },
      });
    }

    if (waitingAdminExpiredIds.length > 0) {
      await tx.transactions.updateMany({
        where: {
          id: { in: waitingAdminExpiredIds },
          status: "WAITING_FOR_ADMIN",
        },
        data: { status: "CANCELLED" },
      });
    }

    await tx.coupons.updateMany({
      where: {
        used_by_transaction_id: {
          in: [...waitingPaymentExpiredIds, ...waitingAdminExpiredIds],
        },
      },
      data: { is_used: false, used_by_transaction_id: null },
    });
    await tx.attendees.deleteMany({
      where: {
        transaction_id: {
          in: [...waitingPaymentExpiredIds, ...waitingAdminExpiredIds],
        },
      },
    });
    await tx.events.update({
      where: { id: eventId },
      data: {
        available_seat: {
          increment:
            waitingPaymentExpiredIds.length + waitingAdminExpiredIds.length,
        },
      },
      select: { id: true },
    });
  });

  return {
    freedSeats: waitingPaymentExpiredIds.length + waitingAdminExpiredIds.length,
  };
};
