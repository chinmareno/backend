import express from "express";
import { isCustomer } from "../middleware/isCustomer";
import { prisma } from "../prisma/db";
import {
  CreateRatingSchema,
  EditRatingSchema,
  QueryRatingSchema,
} from "../schemas/rating";
import { AppError } from "../errors/AppError";
import * as httpContext from "express-http-context";
import { isOrganizer } from "../middleware/isOrganizer";
import { ratingCacheKey } from "../cacheKey/ratingCacheKey";
import { cache } from "../utils/cache";

const router = express.Router();

router.get("/user", isCustomer, async (req, res, next) => {
  try {
    const { data, success, error } = QueryRatingSchema.safeParse(req.query);
    if (!success) throw error;

    const { event_id } = data;
    const { id: userId } = httpContext.get("user");
    const cacheKey = ratingCacheKey({
      eventId: event_id,
      role: "customer",
    });
    let ratingCache = cache.get(cacheKey);

    if (!ratingCache) {
      const eventRatings = await prisma.event_ratings.findMany({
        where: { user_id: userId, event_id },
      });
      cache.set(cacheKey, eventRatings);
      ratingCache = eventRatings;
    }
    return res.json({
      success: true,
      message: "Event ratings fetched successfully",
      data: ratingCache,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/organizer/event/:id", isOrganizer, async (req, res, next) => {
  try {
    const { id: eventId } = req.params;

    const { id: organizerId } = httpContext.get("user");

    const cacheKey = ratingCacheKey({
      eventId: eventId,
      role: "organizer",
    });
    let ratingCache = cache.get(cacheKey);
    if (!ratingCache) {
      const eventRatings = await prisma.event_ratings.findMany({
        where: { event: { organizer_id: organizerId, id: eventId } },
        include: { user: true },
      });
      cache.set(cacheKey, eventRatings);
      ratingCache = eventRatings;
    }
    return res.json({
      success: true,
      message: "Event ratings fetched successfully",
      data: ratingCache,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", isCustomer, async (req, res, next) => {
  try {
    const { data, success, error } = CreateRatingSchema.safeParse(req.body);
    if (!success) throw error;

    const { id: userId } = httpContext.get("user");
    const { rating, event_id, description } = data;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "Invalid user id in rating creation"
      );

    const event = await prisma.events.findUnique({ where: { id: event_id } });
    if (!event)
      throw new AppError(
        "Event not found",
        404,
        "Invalid event id in rating creation"
      );

    const existingRating = await prisma.event_ratings.findUnique({
      where: { user_id_event_id: { user_id: userId, event_id } },
    });
    if (existingRating)
      throw new AppError(
        "You has already rated this event",
        400,
        "Create event rating twice"
      );

    const eventRating = await prisma.event_ratings.create({
      data: { rating, event_id, user_id: userId, description },
    });

    const customerCacheKey = ratingCacheKey({
      eventId: event_id,
      role: "customer",
    });
    const organizerCacheKey = ratingCacheKey({
      eventId: event_id,
      role: "organizer",
    });
    cache.delete(customerCacheKey);
    cache.delete(organizerCacheKey);
    return res.json({
      success: true,
      message: "Event rating created successfully",
      data: eventRating,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", isCustomer, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { id: userId } = httpContext.get("user");
    const { data, success, error } = EditRatingSchema.safeParse(req.body);
    if (!success) throw error;

    const { rating, description } = data;

    const eventRating = await prisma.event_ratings.findUnique({
      where: { id, user_id: userId },
    });
    if (!eventRating)
      throw new AppError(
        "Failed to edit event rating. please try again",
        404,
        "Invalid event rating id in rating update"
      );
    const updatedRating = await prisma.event_ratings.update({
      where: { id, user_id: userId },
      data: { rating, description },
    });

    const eventId = eventRating.event_id;
    const customerCacheKey = ratingCacheKey({
      eventId,
      role: "customer",
    });
    const organizerCacheKey = ratingCacheKey({
      eventId,
      role: "organizer",
    });
    cache.delete(customerCacheKey);
    cache.delete(organizerCacheKey);
    return res.json({
      success: true,
      message: "Event rating updated successfully",
      data: updatedRating,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
