import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma/db";
import { ROLE } from "../generated/prisma";
import * as httpContext from "express-http-context";
import { AppError } from "../errors/AppError";
import { verifyToken } from "../utils/verifyToken";
import { cache } from "../utils/cache";
import { userCacheKey } from "../cacheKey/userCacheKey";

export type User = {
  id: string;
  referral_code: string | null;
  role: ROLE;
  profile_picture_url: string | null;
  username: string;
  email: string;
};

export const AuthUserSelect = {
  id: true,
  referral_code: true,
  role: true,
  profile_picture_url: true,
  username: true,
  email: true,
} as const;

export const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await verifyToken(req);
    const { id: userId } = data.user;
    const cacheKey = userCacheKey(userId);

    let userCache = cache.get(cacheKey);
    if (!userCache) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: AuthUserSelect,
      });
      if (!user)
        throw new AppError(
          "Something went wrong.",
          500,
          "User creation error in isAuth middleware"
        );
      cache.set(cacheKey, user);
      userCache = user;
    }

    httpContext.set("user", userCache as User);
    next();
  } catch (error) {
    next(error);
  }
};
