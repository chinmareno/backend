import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.log.error(err);

  if (err instanceof AppError) {
    if (err.internalMessage) {
      logger.error("Internal Error:" + err.internalMessage);
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
