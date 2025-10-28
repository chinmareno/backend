import express from "express";
import { prisma } from "../prisma/db";
import { ChangeProfilePictureSchema, CreateUserSchema } from "../schemas/user";
import { AppError } from "../errors/AppError";
import * as httpContext from "express-http-context";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.users.findMany({
      include: { coupons: true },
      orderBy: { created_at: "desc" },
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

router.get("/profile", async (req, res, next) => {
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

    const adminEmail = process.env.ADMIN_EMAIL!;
    const { email, username, user_id } = data;
    const user = await prisma.users.create({
      data: {
        role: email.endsWith(adminEmail) ? "ORGANIZER" : "CUSTOMER",
        id: user_id,
        username,
      },
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

router.patch("/profile", async (req, res, next) => {
  try {
    const { id: userId } = httpContext.get("user");
    const { data, success, error } = ChangeProfilePictureSchema.safeParse(
      req.body
    );
    if (!success) {
      throw error;
    }

    const { profile_picture_url } = data;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { profile_picture_url },
    });
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
