export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly internalMessage: string | undefined;

  constructor(
    message: string = "Something went wrong",
    statusCode = 500,
    internalMessage?: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.internalMessage = internalMessage;
  }
}
