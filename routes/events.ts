import express from "express";
import { prisma } from "../prisma/db";
import {
  CreateEventSchema,
  EditEventSchema,
  QueryEventSchema,
} from "../schemas/event";
import { isOrganizer } from "../middleware/isOrganizer";
import { AppError } from "../errors/AppError";
import { TRANSACTION_STATUS } from "../generated/prisma";
import * as httpContext from "express-http-context";
import { isCustomer } from "../middleware/isCustomer";
import { PublicEventSelect } from "../dto/event";
import { getAttendeesByEventId } from "../services/attendees/getAttendeesByEventId";

const router = express.Router();

router.get("/user/", isCustomer, async (req, res, next) => {
  try {
    const { id: userId } = httpContext.get("user");
    const { data, error } = QueryEventSchema.safeParse(req.query);
    if (error) throw error;

    const { category, location, is_free, search, last_event_Id, status } = data;

    let transactionStatus: TRANSACTION_STATUS | null = null;
    if (status === "UNPAID") transactionStatus = "WAITING_FOR_PAYMENT";
    else if (status === "ORDERED") transactionStatus = "WAITING_FOR_ADMIN";
    else if (status === "ACCEPTED") transactionStatus = "DONE";
    else if (status === "REJECTED") transactionStatus = "REJECTED";
    else if (status === "CANCELLED") transactionStatus = "CANCELLED";
    else if (status === "EXPIRED") transactionStatus = "EXPIRED";

    const now = new Date();
    const where = {
      end_date: { gte: now },
      category: category && { hasEvery: category },
      location,
      price: is_free ? 0 : undefined,
      name: search && { contains: search, mode: "insensitive" as const },
      available_seat: { gt: 0 },
      transactions: transactionStatus
        ? { some: { status: transactionStatus, customer_id: userId } }
        : {
            none: {
              status: {
                in: [
                  "DONE",
                  "WAITING_FOR_ADMIN",
                  "WAITING_FOR_PAYMENT",
                ] as TRANSACTION_STATUS[],
              },
              customer_id: userId,
            },
          },
    };

    const [events, total] = await Promise.all([
      prisma.events.findMany({
        where,
        orderBy: [{ start_date: "desc" }, { id: "desc" }],

        take: 5,
        ...(last_event_Id ? { cursor: { id: last_event_Id }, skip: 1 } : {}),
      }),
      prisma.events.count({
        where,
      }),
    ]);

    return res.json({
      success: true,
      message: "Events user fetched successfully",
      data: { events, total },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/organizer/", isOrganizer, async (req, res, next) => {
  try {
    const { id: organizerId } = httpContext.get("user");

    const events = await prisma.events.findMany({
      where: {
        organizer_id: organizerId,
      },
      select: PublicEventSelect,
      orderBy: [{ start_date: "desc" }, { id: "desc" }],
    });

    return res.json({
      success: true,
      message: "Events organizer fetched successfully",
      data: events,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/attendees", isOrganizer, async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { id: organizerId } = httpContext.get("user");
    const event = await prisma.events.findUnique({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new AppError("Event not found", 404);

    const attendees = await getAttendeesByEventId(eventId);

    return res.json({
      success: true,
      message: "Attendees fetched successfully",
      data: attendees,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const event = await prisma.events.findUnique({
      where: { id },
      include: { organizer: true, event_ratings: true },
    });
    if (!event) throw new AppError("Event not found", 404);

    const eventRatingTotal = event.event_ratings.reduce(
      (a, r) => a + r.rating,
      0
    );
    const eventRatingAverage = eventRatingTotal / event.event_ratings.length;

    return res.json({
      success: true,
      message: "Event fetched successfully",
      data: { ...event, eventRating: eventRatingAverage },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", isOrganizer, async (req, res, next) => {
  try {
    const { data, success, error } = CreateEventSchema.safeParse(req.body);
    if (!success) throw error;

    const { id: organizerId } = httpContext.get("user");
    const {
      name,
      price,
      start_date,
      end_date,
      capacity_seat,
      description,
      category,
      location,
    } = data;

    const event = await prisma.events.create({
      data: {
        name,
        price,
        start_date,
        end_date,
        capacity_seat,
        description,
        available_seat: capacity_seat,
        location,
        category,
        organizer_id: organizerId,
      },
    });

    return res.json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", isOrganizer, async (req, res, next) => {
  try {
    const { data, success, error } = EditEventSchema.safeParse(req.body);
    if (!success) throw error;

    const { id: organizerId } = httpContext.get("user");
    const { id: eventId } = req.params;
    const event = await prisma.events.findUnique({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new AppError("Event not found", 404);

    const { name, description, capacity_seat } = data;

    const availableSeat =
      capacity_seat &&
      capacity_seat - event.capacity_seat + event.available_seat;

    if (availableSeat && availableSeat < 0) {
      const booked = event.capacity_seat - event.available_seat;
      throw new AppError(
        `You already have ${booked} seats booked. Capacity cannot be reduced below ${booked}.`,
        400
      );
    }

    const updatedEvent = await prisma.events.update({
      where: { id: eventId },
      data: {
        name,
        description,
        capacity_seat,
        available_seat: availableSeat,
      },
    });

    return res.json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", isOrganizer, async (req, res, next) => {
  try {
    const id = req.params.id;
    const { id: organizerId } = httpContext.get("user");
    const existing = await prisma.events.findUnique({
      where: { id, organizer_id: organizerId },
    });
    if (!existing) throw new AppError("Event not found", 404);

    const deletedEvent = await prisma.events.delete({ where: { id } });

    return res.json({
      success: true,
      message: "Event deleted successfully",
      data: deletedEvent,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
