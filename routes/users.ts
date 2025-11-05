import express from "express";
import { prisma } from "../prisma/db";
import { ChangeProfilePictureSchema, CreateUserSchema } from "../schemas/user";
import * as httpContext from "express-http-context";
import { AuthUserSelect, isAuth } from "../middleware/isAuth";
import { userCacheKey } from "../cacheKey/userCacheKey";
import { cache } from "../utils/cache";

const router = express.Router();

// For sake of testing
router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.users.findMany({
      include: { coupons_as_claimer: true },
      orderBy: [{ role: "desc" }],
    });

    return res.json({
      success: true,
      message: "All users fetched successfully",
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile", isAuth, async (req, res, next) => {
  try {
    const user = httpContext.get("user");

    return res.json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { data, success, error } = CreateUserSchema.safeParse(req.body);
    if (!success) {
      throw error;
    }

    const adminEmail = process.env.ORGANIZER_EMAIL!;
    const { email, username, user_id } = data;
    const user = await prisma.users.create({
      data: {
        role: email.endsWith(adminEmail) ? "ORGANIZER" : "CUSTOMER",
        id: user_id,
        username,
        email,
      },
      select: AuthUserSelect,
    });
    return res.json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", isAuth, async (req, res, next) => {
  try {
    const { id: userId } = httpContext.get("user");
    const { data, success, error } = ChangeProfilePictureSchema.safeParse(
      req.body
    );
    if (!success) throw error;

    const { profile_picture_url } = data;

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { profile_picture_url },
      select: AuthUserSelect,
    });
    const cacheKey = userCacheKey(userId);
    cache.delete(cacheKey);

    return res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
