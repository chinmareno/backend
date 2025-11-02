import { prisma } from "../../prisma/db";

export const getAttendeesByEventId = async (eventId: string) => {
  const attendees = await prisma.attendees.findMany({
    where: {
      event_id: eventId,
    },
    include: { event: true, user: true, transaction: true },
  });

  const attendeesMapped = attendees.map(({ transaction, event, ...rest }) => ({
    ...rest,
    username: transaction.customer_name,
    eventName: event.name,
    eventPrice: event.price,
    transactionId: transaction.id,
    couponDiscount: transaction.coupon_discount,
    voucherDiscount: transaction.voucher_discount,
    voucherCode: transaction.voucher_code,
    amountPaid: transaction.amount_paid,
    payment_proof_url: transaction.payment_proof_url,
  }));

  return attendeesMapped;
};
