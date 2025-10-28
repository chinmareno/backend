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
  COUPON_EXPIRATION_MONTHS,
  PAYMENT_EXPIRATION_HOURS,
  WAITING_FOR_ADMIN_EXPIRATION_DAYS,
  WAITING_FOR_PAYMENT_EXPIRATION_HOURS,
} from "../configs/expiration";
import { isOrganizer } from "../middleware/isOrganizer";
import * as httpContext from "express-http-context";

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

    const transactions = await prisma.transactions.findMany({
      where: { user_id: userId },
      include: { event: true },
    });

    const expiredTransactionIds = transactions
      .filter((t) => {
        const transactionAge = timeDif(t.updated_at).hours;
        const isExpiredTransaction =
          t.status === "WAITING_FOR_PAYMENT" &&
          transactionAge > WAITING_FOR_PAYMENT_EXPIRATION_HOURS;

        return isExpiredTransaction;
      })
      .map(({ id }) => id);

    const cancelledTransactionIds = transactions
      .filter((t) => {
        const transactionAge = timeDif(t.updated_at).days;
        const isCancelledTransaction =
          t.status === "WAITING_FOR_ADMIN" &&
          transactionAge > WAITING_FOR_ADMIN_EXPIRATION_DAYS;

        return isCancelledTransaction;
      })
      .map(({ id }) => id);

    await prisma.$transaction(async (tx) => {
      if (expiredTransactionIds.length > 0) {
        await tx.transactions.updateMany({
          where: { id: { in: expiredTransactionIds } },
          data: { status: "EXPIRED" },
        });
        await tx.events.updateMany({
          where: {
            transactions: { some: { id: { in: expiredTransactionIds } } },
          },
          data: {
            available_seat: {
              increment: expiredTransactionIds.length,
            },
          },
        });
      }
      if (cancelledTransactionIds.length > 0) {
        await tx.transactions.updateMany({
          where: { id: { in: cancelledTransactionIds } },
          data: { status: "CANCELLED" },
        });
        await tx.events.updateMany({
          where: {
            transactions: { some: { id: { in: cancelledTransactionIds } } },
          },
          data: {
            available_seat: {
              increment: cancelledTransactionIds.length,
            },
          },
        });
      }
    });

    const validTransactions = transactions.filter(
      (t) =>
        ![...expiredTransactionIds, ...cancelledTransactionIds].includes(t.id)
    );

    return res.json({
      success: true,
      message: "transactions by user id fetched",
      data: validTransactions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/event/:id", async (req, res, next) => {
  try {
    const { id: event_id } = req.params;
    const transactions = await prisma.transactions.findMany({
      where: { event_id, status: { in: ["DONE", "WAITING_FOR_ADMIN"] } },
    });

    return res.json({
      success: true,
      message: "transactions by event id fetched",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = httpContext.get("user");

    let transaction = await prisma.transactions.findUnique({
      where: { id, user_id: userId },
      include: { event: true, coupons_used: true, voucher_used: true },
    });
    if (!transaction) throw new AppError("Transaction not found", 404);

    const isExpiredPayment =
      timeDif(transaction.updated_at).hours > PAYMENT_EXPIRATION_HOURS &&
      transaction.status === "WAITING_FOR_PAYMENT";
    const isExpiredConfirmation =
      timeDif(transaction.updated_at).days >
        WAITING_FOR_ADMIN_EXPIRATION_DAYS &&
      transaction.status === "WAITING_FOR_ADMIN";

    if (isExpiredPayment || isExpiredConfirmation)
      transaction = await prisma.transactions.update({
        where: { id },
        data: {
          status: isExpiredPayment ? "EXPIRED" : "CANCELLED",
          event: { update: { available_seat: { increment: 1 } } },
        },
        include: { event: true, coupons_used: true, voucher_used: true },
      });

    const { coupons_used, voucher_used, event } = transaction;
    const couponsDiscount =
      coupons_used.length === 0
        ? 0
        : coupons_used.reduce((acc, c) => acc + c.discount, 0);
    const voucherDiscount = voucher_used?.discount || 0;
    const isFree =
      event.price === 0 ||
      event.price - (couponsDiscount + voucherDiscount) <= 0;

    const mappedTransaction = {
      ...transaction,
      isFree,
      couponsDiscount,
      voucherDiscount,
    };

    return res.json({
      success: true,
      message: "transaction fetched",
      data: mappedTransaction,
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
    const { id: userId } = httpContext.get("user");
    const { event_id, coupon_ids, voucher_id } = data;
    const isOrdered = await prisma.transactions.findMany({
      where: {
        event_id,
        user_id: userId,
        status: { in: ["DONE", "WAITING_FOR_ADMIN"] },
      },
    });
    if (isOrdered.length > 0)
      throw new AppError("Event already ordered, cannot order twice", 500);

    const event = await prisma.events.findUnique({
      where: { id: event_id },
      include: { vouchers: !!voucher_id },
    });
    if (!event) throw new AppError("Event not found", 404);

    if (voucher_id) {
      const eventVoucher = event.vouchers.find(
        (voucher) => voucher.id === voucher_id
      );

      if (!eventVoucher) throw new AppError("Voucher not found", 404);

      if (!eventVoucher.is_active)
        throw new AppError("Voucher is inactive", 400);

      const now = new Date();
      if (eventVoucher.valid_from > now)
        throw new AppError("Voucher not yet active", 400);
      if (eventVoucher.valid_until < now)
        throw new AppError("Voucher has expired", 400);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) throw new AppError("User not found", 404);

    if (coupon_ids.length > 0) {
      const coupons = await prisma.coupons.findMany({
        where: {
          user_id: userId,
          id: { in: coupon_ids },
          OR: [
            { transaction: null },
            {
              transaction: { status: { notIn: ["WAITING_FOR_ADMIN", "DONE"] } },
            },
          ],
        },
      });
      const validCouponIds = coupons.filter((coupon) => {
        const couponAge = timeDif(coupon.created_at).months;
        const isExpiredCoupon = couponAge > COUPON_EXPIRATION_MONTHS;

        return !isExpiredCoupon;
      });

      if (validCouponIds.length !== coupon_ids.length)
        throw new AppError(
          "One or more coupons are invalid/already used/expired. try refresh the page",
          400
        );
    }

    if (event.available_seat === 0) {
      const transactions = await prisma.transactions.findMany({
        where: { event_id, status: "WAITING_FOR_ADMIN" },
      });

      const expiredTransactionIds = transactions
        .filter((t) => {
          const transactionAge = timeDif(t.updated_at).hours;
          const isExpiredTransaction =
            t.status === "WAITING_FOR_PAYMENT" &&
            transactionAge > WAITING_FOR_PAYMENT_EXPIRATION_HOURS;

          return isExpiredTransaction;
        })
        .map(({ id }) => id);

      const cancelledTransactionIds = transactions
        .filter((t) => {
          const transactionAge = timeDif(t.updated_at).days;
          const isCancelledTransaction =
            t.status === "WAITING_FOR_ADMIN" &&
            transactionAge > WAITING_FOR_ADMIN_EXPIRATION_DAYS;

          return isCancelledTransaction;
        })
        .map(({ id }) => id);

      if (
        cancelledTransactionIds.length > 0 ||
        expiredTransactionIds.length > 0
      ) {
        if (cancelledTransactionIds.length > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.transactions.updateMany({
              where: { id: { in: cancelledTransactionIds } },
              data: { status: "CANCELLED" },
            });

            await tx.events.update({
              where: { id: event_id },
              data: {
                available_seat: {
                  increment: cancelledTransactionIds.length,
                },
              },
            });
          });
        }
        if (expiredTransactionIds.length > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.transactions.updateMany({
              where: { id: { in: expiredTransactionIds } },
              data: { status: "EXPIRED" },
            });

            await tx.events.update({
              where: { id: event_id },
              data: {
                available_seat: {
                  increment: expiredTransactionIds.length,
                },
              },
            });
          });
        }
      } else {
        throw new AppError("No available seats", 400);
      }
    }

    const createdTransaction = await prisma.$transaction(async (tx) => {
      const isFreeEvent = event.price === 0;
      const transaction = await tx.transactions.create({
        data: {
          event_id,
          user_id: userId,
          voucher_id_used: isFreeEvent ? undefined : voucher_id,
        },
        include: { voucher_used: true },
      });
      await tx.events.update({
        where: { id: transaction.event_id },
        data: { available_seat: { decrement: 1 } },
      });

      const isFreeTransaction =
        (transaction.voucher_used?.discount || 0) >= event.price;
      if (coupon_ids && !isFreeTransaction) {
        await tx.coupons.updateMany({
          where: { id: { in: coupon_ids } },
          data: { transaction_id: transaction.id },
        });
      }
      const createdTransaction = await tx.transactions.findUnique({
        where: { id: transaction.id },
        include: { coupons_used: true, voucher_used: true },
      });
      if (createdTransaction) {
        const { coupons_used, voucher_used } = createdTransaction;
        const couponsDiscount =
          coupons_used.length === 0
            ? 0
            : coupons_used.reduce((acc, c) => acc + c.discount, 0);
        const voucherDiscount = voucher_used?.discount || 0;
        const isFree =
          event.price === 0 ||
          event.price - couponsDiscount - voucherDiscount <= 0;
        await tx.transactions.update({
          where: { id: createdTransaction.id },
          data: {
            status: isFree ? "WAITING_FOR_ADMIN" : "WAITING_FOR_PAYMENT",
          },
        });
        return { ...createdTransaction, isFree };
      }
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

    const transaction = await prisma.transactions.findUnique({
      where: { id, user_id: userId, status: "WAITING_FOR_PAYMENT" },
      include: { coupons_used: true },
    });

    if (!transaction) throw new AppError("Transaction not found", 404);

    const hoursDif = timeDif(transaction.created_at).hours;
    if (hoursDif > PAYMENT_EXPIRATION_HOURS) {
      await prisma.transactions.update({
        where: { id, status: "WAITING_FOR_PAYMENT" },
        data: {
          status: "EXPIRED",
          event: { update: { available_seat: { increment: 1 } } },
        },
      });
      throw new AppError(
        "Transaction expired, please make a new transaction",
        400
      );
    }

    if (transaction.coupons_used.length > 0) {
      const isExpiredCoupons = transaction.coupons_used.some((c) => {
        const couponAge = timeDif(c.created_at).months;
        const isExpiredCoupon = couponAge > COUPON_EXPIRATION_MONTHS;

        return isExpiredCoupon;
      });
      if (isExpiredCoupons)
        throw new AppError("Some coupons have expired.", 400);
    }

    const updatedTransaction = await prisma.transactions.update({
      where: { id },
      data: {
        status: "WAITING_FOR_ADMIN",
        payment_proof_url,
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
      where: { id, user_id: userId, status: "WAITING_FOR_PAYMENT" },
    });
    if (!oldTransaction)
      throw new AppError("This transaction already canceled/invalid", 404);

    const updatedTransaction = await prisma.transactions.update({
      where: { id, status: "WAITING_FOR_PAYMENT" },
      data: {
        status: "CANCELLED",
        event: { update: { available_seat: { increment: 1 } } },
      },
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

    const transaction = await prisma.transactions.findUnique({
      where: {
        id,
        event: { organizer_id: organizerId },
        status: "WAITING_FOR_ADMIN",
      },
    });

    if (!transaction)
      throw new AppError("Transaction not found or already processed", 404);

    const updatedTransaction = await prisma.transactions.update({
      where: { id },
      data: { status: "DONE" },
    });

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
    });

    if (!transaction)
      throw new AppError("Transaction not found or already processed", 404);

    const updatedTransaction = await prisma.transactions.update({
      where: { id },
      data: {
        status: "REJECTED",
        event: { update: { available_seat: { increment: 1 } } },
      },
    });

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
