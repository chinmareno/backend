import { prisma } from "../../prisma/db";
import { timeDif } from "../../utils/timeDif";

type Params = {
  id: string;
  userId?: string;
};

export const getTransactionById = async ({ id, userId }: Params) => {
  const transaction = await prisma.transactions.findUnique({
    where: { id, customer_id: userId },
    include: { event: true },
  });
  if (transaction?.status === "WAITING_FOR_PAYMENT" && transaction.expired_at) {
    const { expired_at } = transaction;
    const { seconds, isPassed } = timeDif(expired_at);
    if (!isPassed) return { ...transaction, secondsLeft: Math.ceil(seconds) };
  }

  return transaction;
};
