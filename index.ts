import express from "express";
import appRouter from "./routes";
import userRouter from "./routes/users";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger";
import { isAuth } from "./middleware/isAuth";
import * as httpContext from "express-http-context";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./prisma/db";
import { QueryAnalyticSchema } from "./schemas/analytic";
import { Prisma } from "./generated/prisma";

const app: express.Application = express();

const allowedOrigin = process.env.CLIENT_ORIGIN!;
const port = process.env.SERVER_PORT!;

app.use(
  cors({
    credentials: true,
    origin: [allowedOrigin],
  })
);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

app.use(express.json());

app.use(cookieParser());

app.use(httpContext.middleware);

app.use(pinoHttp({ logger, autoLogging: false }));

app.use("/users", userRouter);
app.use("/", isAuth, appRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`TypeScript with Express 
         http://localhost:${port}/`);
});
