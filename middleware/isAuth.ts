import { NextFunction, Request, Response } from "express";
import { supabase } from "../supabase";
import { prisma } from "../prisma/db";
import { ROLE } from "../generated/prisma";
import * as httpContext from "express-http-context";
import { AuthError } from "../errors/AuthError";
import { AppError } from "../errors/AppError";
import jwt from "jsonwebtoken";

export type User = {
  id: string;
  referral_code: string | null;
  created_at: Date;
  role: ROLE;
  profile_picture_url: string | null;
  username: string;
};

export const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    console.log(token);
    if (!token)
      throw new AuthError(
        "Session expired. try to relogin",
        401,
        "Token not found"
      );
    const JWT_SECRET = process.env.JWT_SECRET!;
    console.log(JWT_SECRET);
    const decodedToken = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log(decodedToken);
    const userId = decodedToken.userId;
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user)
      throw new AuthError(
        "Invalid token",
        401,
        "User id in jwt is being tampered"
      );

    httpContext.set("user", user);
  } catch (error) {
    next(error);
  }
};
