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
  logger.error({
    url: req.url,
    method: req.method,
    body: req.body,
    host: req.host,
  });

  if (err instanceof AppError) {
    if (err.internalMessage) {
      logger.error("App Error: " + err.internalMessage);
    }
    logger.error(err);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    logger.error(err);
    return res.status(400).json({
      success: false,
      message: "Invalid input",
    });
  }

  logger.error(err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
