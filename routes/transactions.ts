import express from "express";
import { prisma } from "../prisma/db";
import {
  CreateTransactionSchema,
  CompleteTransactionSchema,
} from "../schemas/transaction";
import { isCustomer } from "../middleware/isCustomer";
import { AppError } from "../errors/AppError";
import { timeDif } from "../utils/timeDif";
import {
  PAYMENT_EXPIRATION_HOURS,
  WAITING_FOR_ADMIN_EXPIRATION_DAYS,
} from "../configs/expiration";
import { isOrganizer } from "../middleware/isOrganizer";
import * as httpContext from "express-http-context";
import { emailer } from "../utils/emailer";
import { format } from "date-fns";
import { logger } from "../utils/logger";
import { addTime } from "../utils/addTime";
import { cleanupExpiredTransactions } from "../services/transactions/cleanupExpiredTransactions";
import { QueryTransactionSchema } from "../schemas/transaction";
import { getTransactionById } from "../services/transactions/getTransactionById";
import { ADMIN_FEE_PERCENTAGE } from "../configs/adminFee";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const transactions = await prisma.transactions.findMany();
    return res.json({
      success: true,
      message: "transactions successfully fetched",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/user/", async (req, res, next) => {
  try {
    const { id: userId } = httpContext.get("user");
    const { success, data, error } = QueryTransactionSchema.safeParse(
      req.query
    );
    if (!success) throw error;

    const { status, event_id } = data;
    await cleanupExpiredTransactions({ eventId: event_id, userId });
    const now = new Date();
    const transactions = await prisma.transactions.findMany({
      where: {
        customer_id: userId,
        event_id,
        expired_at: { gt: now },
        status,
      },
    });

    return res.json({
      success: true,
      message: "transactions by user id fetched",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/", async (req, res, next) => {
  try {
    const { id } = req.params;

    await cleanupExpiredTransactions({ id });
    const transaction = await getTransactionById({ id });
    if (!transaction) throw new AppError("Transaction not found", 404);

    return res.json({
      success: true,
      message: "transaction fetched",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { data, success, error } = CreateTransactionSchema.safeParse(
      req.body
    );
    if (!success) throw error;

    const { id: userId, username } = httpContext.get("user");
    const { event_id, coupon_ids, voucher_id } = data;
    const isOrdered = await prisma.transactions.count({
      where: {
        event_id,
        customer_id: userId,
        status: { in: ["DONE", "WAITING_FOR_ADMIN"] },
      },
    });
    const now = new Date();
    if (isOrdered > 0)
      throw new AppError("Event already ordered, cannot order twice", 500);
    const event = await prisma.events.findUnique({
      where: { id: event_id },
      include: {
        vouchers: !!voucher_id && {
          where: {
            valid_from: { lt: now },
            valid_until: { gt: now },
            id: voucher_id,
            is_active: true,
          },
          take: 1,
        },
      },
    });
    if (!event) throw new AppError("Event not found", 404);

    let voucherDiscount = 0;
    let voucherCode = null;
    if (voucher_id) {
      const eventVoucher = event.vouchers[0];
      if (!eventVoucher) throw new AppError("Voucher not found/invalid", 404);
      voucherDiscount = eventVoucher.discount;
      voucherCode = eventVoucher.code;
    }

    let couponsDiscount = 0;
    if (coupon_ids.length > 0) {
      const validCoupons = await prisma.coupons.findMany({
        where: {
          claimer_id: userId,
          id: { in: coupon_ids },
          is_used: false,
          expired_at: { gt: now },
        },
      });

      if (validCoupons.length !== coupon_ids.length) {
        throw new AppError(
          "One or more coupons are invalid/already used/expired. try refresh the page",
          400
        );
      }

      couponsDiscount = validCoupons.reduce((acc, c) => acc + c.discount, 0);
    }

    if (event.available_seat === 0) {
      const { freedSeats } = await cleanupExpiredTransactions({
        eventId: event_id,
      });
      if (freedSeats <= 0) throw new AppError("No available seats", 400);
    }

    const createdTransaction = await prisma.$transaction(async (tx) => {
      const isFreeEvent = event.price === 0;
      const priceAfterVoucher = Math.max(event.price - voucherDiscount, 0);
      const appliedCouponDiscount = Math.min(
        couponsDiscount,
        priceAfterVoucher
      );
      const amountPaid = priceAfterVoucher - appliedCouponDiscount;
      const isFree = amountPaid === 0;
      const shouldApplyVoucher = !isFreeEvent && voucherDiscount > 0;
      const shouldApplyCoupons =
        !isFreeEvent && priceAfterVoucher > 0 && appliedCouponDiscount > 0;

      const crossCheckEvent = await tx.events.findUnique({
        where: { id: event_id },
        select: { available_seat: true },
      });

      if (!crossCheckEvent || crossCheckEvent.available_seat === 0) {
        throw new AppError("No available seats", 400);
      }

      const expiredDate = addTime(now, { hours: PAYMENT_EXPIRATION_HOURS });
      const organizerNetRevenue = event.price - voucherDiscount;
      const adminFee = Math.ceil(
        organizerNetRevenue * (ADMIN_FEE_PERCENTAGE / 100)
      );

      const transaction = await tx.transactions.create({
        data: {
          customer_name: username,
          event_id,
          customer_id: userId,
          voucher_id_used: shouldApplyVoucher ? voucher_id : null,
          amount_paid: amountPaid,
          voucher_discount: shouldApplyVoucher ? voucherDiscount : 0,
          voucher_code: shouldApplyVoucher ? voucherCode : null,
          coupon_discount: shouldApplyCoupons ? appliedCouponDiscount : 0,
          status: isFree ? "WAITING_FOR_ADMIN" : "WAITING_FOR_PAYMENT",
          expired_at: expiredDate,
          organizer_id: event.organizer_id,
          admin_fee_amount: adminFee,
          admin_fee_percentage: ADMIN_FEE_PERCENTAGE,
        },
        include: { voucher_used: true },
      });
      if (isFree) {
        await tx.attendees.create({
          data: {
            transaction_id: transaction.id,
            is_accepted: false,
            user_id: userId,
            event_id: transaction.event_id,
          },
        });
        await tx.events.update({
          where: { id: transaction.event_id },
          data: {
            available_seat: { decrement: 1 },
          },
        });
      }
      if (shouldApplyCoupons && coupon_ids && coupon_ids.length > 0) {
        await tx.coupons.updateMany({
          where: { id: { in: coupon_ids } },
          data: { used_by_transaction_id: transaction.id, is_used: true },
        });
      }

      return { ...transaction, isFree };
    });

    return res.json({
      success: true,
      message: "Create transaction successfully",
      data: createdTransaction,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/payment/:id", isCustomer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = httpContext.get("user");

    const { success, data, error } = CompleteTransactionSchema.safeParse(
      req.body
    );
    if (!success) {
      throw error;
    }

    const { payment_proof_url } = data;
    const now = new Date();
    const transaction = await prisma.transactions.findUnique({
      where: { id, customer_id: userId, status: "WAITING_FOR_PAYMENT" },
      include: { coupons_used: { where: { expired_at: { gt: now } } } },
    });

    if (!transaction) throw new AppError("Transaction not found", 404);

    const hoursDif = timeDif(transaction.created_at).hours;
    if (hoursDif > PAYMENT_EXPIRATION_HOURS) {
      await prisma.$transaction(async (tx) => {
        await tx.transactions.update({
          where: { id, status: "WAITING_FOR_PAYMENT" },
          data: {
            status: "EXPIRED",
            event: { update: { available_seat: { increment: 1 } } },
          },
        });
        await tx.coupons.updateMany({
          where: { used_by_transaction_id: id },
          data: { is_used: false },
        });
      });
      throw new AppError(
        "Transaction expired, please make a new transaction",
        400
      );
    }

    const expiryDate = addTime(now, {
      days: WAITING_FOR_ADMIN_EXPIRATION_DAYS,
    });
    const updatedTransaction = await prisma.transactions.update({
      where: { id },
      data: {
        status: "WAITING_FOR_ADMIN",
        payment_proof_url,
        expired_at: expiryDate,
        attendee: {
          create: {
            event_id: transaction.event_id,
            user_id: transaction.customer_id,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payment submitted successfully — awaiting admin confirmation.",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/cancel/:id", isCustomer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = httpContext.get("user");

    const oldTransaction = await prisma.transactions.findUnique({
      where: { id, customer_id: userId, status: "WAITING_FOR_PAYMENT" },
    });
    if (!oldTransaction)
      throw new AppError("This transaction already canceled/invalid", 404);

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transactions.update({
        where: { id, status: "WAITING_FOR_PAYMENT" },
        data: {
          status: "CANCELLED",
          event: {
            update: {
              available_seat: { increment: 1 },
            },
          },
        },
      });
      await tx.attendees.delete({
        where: {
          user_id_event_id: {
            user_id: userId,
            event_id: updatedTransaction.event_id,
          },
        },
      });
      await tx.coupons.updateMany({
        where: { used_by_transaction_id: updatedTransaction.id },
        data: { is_used: false },
      });
      return updatedTransaction;
    });

    return res.status(200).json({
      success: true,
      message: "Transaction cancelled successfully.",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/accept/:id", isOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: organizerId } = httpContext.get("user");

    const now = new Date();
    const transaction = await prisma.transactions.findUnique({
      where: {
        id,
        event: { organizer_id: organizerId },
        status: "WAITING_FOR_ADMIN",
        expired_at: { gt: now },
      },
      include: { event: true, customer_user: true },
    });

    if (!transaction) {
      throw new AppError(
        "Transaction not found or already processed. please try refresh the page.",
        404
      );
    }

    const updatedTransaction = await prisma.transactions.update({
      where: { id },
      data: {
        status: "DONE",
        completed_at: now,
        attendee: {
          update: {
            is_accepted: true,
          },
        },
      },
    });

    const event = transaction.event;
    const customer = transaction.customer_user;
    const formattedStartDate = format(event.start_date, "dd-MM-yyyy");
    const { error } = await emailer.send({
      from: "IkutEvent Team <onboarding@resend.dev>",
      to: [customer.email],
      subject: `✅ Your attendance for ${event.name} is accepted`,
      html: `
      <p>Hi ${customer.username},</p>
      <p>Great news! Your attendance for <strong>${event.name}</strong> on ${formattedStartDate} is accepted.</p>
      <p>Don't forget to attend and have fun!</p>
      <p>— The IkutEvent Team —</p>
    `,
      replyTo: "onboarding@resend.dev",
    });
    if (error) {
      logger.error(
        {
          transactionId: transaction.id,
          userId: customer.id,
          eventId: event.id,
          emailError: error,
        },
        `Failed to send acceptance email for ${event.name} event to ${customer.username}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Transaction accepted successfully.",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/reject/:id", isOrganizer, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: organizerId } = httpContext.get("user");

    const transaction = await prisma.transactions.findUnique({
      where: {
        id,
        event: { organizer_id: organizerId },
        status: "WAITING_FOR_ADMIN",
      },
      include: { event: true, customer_user: true },
    });

    if (!transaction) {
      throw new AppError("Transaction not found or already processed", 404);
    }

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transactions.update({
        where: { id },
        data: {
          status: "REJECTED",
          event: { update: { available_seat: { increment: 1 } } },
          expired_at: null,
        },
      });

      await tx.attendees.delete({
        where: {
          user_id_event_id: {
            user_id: updatedTransaction.customer_id,
            event_id: updatedTransaction.event_id,
          },
        },
      });

      await tx.coupons.updateMany({
        where: { used_by_transaction_id: updatedTransaction.id },
        data: { is_used: false },
      });
      return updatedTransaction;
    });

    const event = transaction.event;
    const customer = transaction.customer_user;
    const formattedStartDate = format(event.start_date, "dd-MM-yyyy");

    const { error } = await emailer.send({
      from: "IkutEvent Team <onboarding@resend.dev>",
      to: [customer.email],
      subject: `❌ Your attendance for ${event.name} was rejected`,
      html: `
        <p>Hi ${customer.username},</p>
        <p>We’re sorry to inform you that your attendance for <strong>${event.name}</strong> on ${formattedStartDate} has been rejected.</p>
        <p>If you have any questions, please contact the organizer.</p>
        <p>— The IkutEvent Team —</p>
      `,
      replyTo: "onboarding@resend.dev",
    });

    if (error) {
      logger.error(
        {
          transactionId: transaction.id,
          userId: customer.id,
          eventId: event.id,
          emailError: error,
        },
        `Failed to send rejection email for ${event.name} event to ${customer.username}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Transaction rejected successfully.",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
