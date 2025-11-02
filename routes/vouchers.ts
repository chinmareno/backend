import express from "express";
import { prisma } from "../prisma/db";
import {
  CreateVoucherSchema,
  ToggleActiveVoucherSchema,
  ValidateVoucherSchema,
} from "../schemas/voucher";
import { isOrganizer } from "../middleware/isOrganizer";
import { AppError } from "../errors/AppError";

const router = express.Router();

// For testing
router.get("/", async (req, res, next) => {
  try {
    const vouchers = await prisma.vouchers.findMany({
      include: { event: true },
      orderBy: { created_at: "desc" },
    });

    const mappedVouchers = vouchers.map(({ event, ...rest }) => ({
      ...rest,
      eventName: event?.name,
    }));

    return res.json({
      success: true,
      message: "Vouchers fetched successfully",
      data: mappedVouchers,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/validate", async (req, res, next) => {
  try {
    const { success, data, error } = ValidateVoucherSchema.safeParse(req.query);
    if (!success) throw error;

    const { code, event_id } = data;
    const voucher = await prisma.vouchers.findUnique({
      where: { code_event_id: { code, event_id } },
    });
    if (!voucher)
      throw new AppError(
        "Seems like this code is invalid. Let's check and try again.",
        404
      );

    if (!voucher.is_active)
      throw new AppError("This voucher is not active currently.", 400);

    const now = new Date();
    if (voucher.valid_until < now) {
      return res.status(400).json({
        success: false,
        message: "This voucher has expired.",
      });
    }

    if (voucher.valid_from > now) {
      return res.status(400).json({
        success: false,
        message: "This voucher is not active yet.",
      });
    }

    return res.json({
      success: true,
      message: "Voucher applied",
      data: voucher,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:event_id", async (req, res, next) => {
  try {
    const { event_id } = req.params;
    const vouchers = await prisma.vouchers.findMany({
      where: { event_id },
      orderBy: { created_at: "desc" },
    });

    return res.json({
      success: true,
      message: "Vouchers for this event fetched successfully",
      data: vouchers,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", isOrganizer, async (req, res, next) => {
  try {
    const { success, data, error } = CreateVoucherSchema.safeParse(req.body);

    if (!success) {
      throw error;
    }

    const { code, event_id, is_active, valid_from, discount, valid_until } =
      data;

    const eventExists = await prisma.events.findUnique({
      where: { id: event_id },
    });

    if (!eventExists) throw new AppError("Event not found", 404);

    if (eventExists.price < discount)
      throw new AppError("Discount cannot exceed event price", 400);

    const existingVoucher = await prisma.vouchers.findUnique({
      where: { code_event_id: { code, event_id } },
    });

    if (existingVoucher)
      throw new AppError(
        "Voucher with this code already exists for this event",
        409
      );

    const voucher = await prisma.vouchers.create({
      data: {
        code,
        discount,
        valid_from,
        valid_until,
        event_id,
        is_active,
      },
    });

    return res.json({
      success: true,
      message: "Voucher created successfully",
      data: voucher,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", isOrganizer, async (req, res, next) => {
  try {
    const id = req.params.id;

    const existing = await prisma.vouchers.findUnique({ where: { id } });
    if (!existing) throw new AppError("Voucher not found", 404);

    const deletedVoucher = await prisma.vouchers.delete({ where: { id } });

    return res.json({
      success: true,
      message: "Voucher deleted successfully",
      data: deletedVoucher,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", isOrganizer, async (req, res, next) => {
  try {
    const id = req.params.id;

    const { success, data, error } = ToggleActiveVoucherSchema.safeParse(
      req.body
    );

    if (!success) {
      throw error;
    }

    const updatedVoucher = await prisma.vouchers.update({
      where: { id },
      data: { is_active: data.is_active },
    });

    return res.json({
      success: true,
      message: "Voucher active status updated successfully",
      data: updatedVoucher,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
