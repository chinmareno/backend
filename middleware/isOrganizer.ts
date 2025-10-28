import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import * as httpContext from "express-http-context";

export const isOrganizer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = httpContext.get("user");

    if (user.role !== "ORGANIZER")
      throw new AppError("Forbidden. Only organizer can access this page", 403);

    next();
  } catch (error) {
    next(error);
  }
};
