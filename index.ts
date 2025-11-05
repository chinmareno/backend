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
import { analyticEventCacheKey } from "./cacheKey/analyticCacheKey";
import { cache } from "./utils/cache";

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

app.get("/test/:id", async (req, res, next) => {
  try {
    const { id: eventId } = req.params;

    const cacheKey = analyticEventCacheKey(eventId);
    let analyticCache = cache.get(cacheKey);
    if (!analyticCache) {
      console.log(eventId);
      const rawAnalytic = await prisma.$queryRaw<
        {
          total_tickets_sold: number;
          gross_revenue: number;
          marketing_expense: number;
          administrative_expense: number;
          net_revenue: number;
        }[]
      >`SELECT
            COUNT(*) AS total_tickets_sold,
            COALESCE(SUM(amount_paid + coupon_discount), 0) AS gross_revenue,
            COALESCE(SUM(voucher_discount), 0) AS marketing_expense,
            COALESCE(SUM(admin_fee_amount), 0) AS administrative_expense,
            COALESCE(SUM(amount_paid + coupon_discount - voucher_discount - admin_fee_amount), 0) AS net_revenue
          FROM "transactions"
          WHERE status = 'DONE'
          AND event_id = ${eventId}
        `;
      console.log(rawAnalytic);

      const analytic = rawAnalytic.map(
        ({
          gross_revenue,
          administrative_expense,
          marketing_expense,
          net_revenue,
          total_tickets_sold,
        }) => {
          const grossRevenue = Number(gross_revenue);
          const administrativeExpense = Number(administrative_expense);
          const marketingExpense = Number(marketing_expense);
          const netRevenue = Number(net_revenue);
          const totalTicketsSold = Number(total_tickets_sold);

          return {
            grossRevenue,
            administrativeExpense,
            marketingExpense,
            netRevenue,
            totalTicketsSold,
          };
        }
      );

      analyticCache = analytic;
    }

    return res.json({
      success: true,
      message: "Organizer's event analytic fetched successfully!",
      data: analyticCache,
    });
  } catch (err) {
    next(err);
  }
});
app.use("/users", userRouter);
app.use("/", isAuth, appRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`TypeScript with Express 
         http://localhost:${port}/`);
});
