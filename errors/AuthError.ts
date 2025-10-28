import { AppError } from "./AppError";

export class AuthError extends AppError {
  constructor(
    message: string = "Session expired. try to relogin",
    statusCode = 401,
    internalMessage?: string,
    isOperational = true
  ) {
    super(message, statusCode, internalMessage, isOperational);
  }
}
