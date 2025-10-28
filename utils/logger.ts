import pino from "pino";
import { pinoHttp } from "pino-http";

export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const httpLogger = pinoHttp({ logger, level: "debug" });

export const errorLogger = pinoHttp({ logger, level: "error" });
