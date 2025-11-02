import express from "express";
import { isOrganizer } from "../middleware/isOrganizer";
import { prisma } from "../prisma/db";
import * as httpContext from "express-http-context";
import { QueryAnalyticSchema } from "../schemas/analytic";
import { isAdmin } from "../middleware/isAdmin";
import { Prisma } from "../generated/prisma";
import { cache } from "../utils/cache";
import { analyticCacheKey } from "../cacheKey/analyticCacheKey";

const router = express.Router();

router.get("/organizer/", isOrganizer, async (req, res, next) => {
  try {
    const { success, data, error } = QueryAnalyticSchema.safeParse(req.query);
    if (!success) throw error;

    const { id: organizerId } = httpContext.get("user");
    const { year, month } = data;

    const cacheKey = analyticCacheKey({ role: "organizer", month, year });
    let analyticCache = cache.get(cacheKey);
    if (analyticCache) console.log("tdk mengquery");
    if (!analyticCache) {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      let period: "year" | "month" | "day";

      if (year && !month) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);
        period = "month";
      } else if (year && month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 1);
        period = "day";
      } else {
        period = "year";
      }

      const isEmptyDate = !startDate && !endDate;
      const dateFilter = isEmptyDate
        ? Prisma.empty
        : Prisma.sql`AND completed_at >= ${startDate} AND completed_at < ${endDate}`;
      console.log("mengquery");
      const rawAnalytic = await prisma.$queryRaw<
        {
          period_value: number;
          total_tickets_sold: number;
          total_events_held: number;
          gross_revenue: number;
          marketing_expense: number;
          administrative_expense: number;
          net_revenue: number;
        }[]
      >`SELECT
            DATE_PART(${period}, completed_at) AS period_value,
            COUNT(*) AS total_tickets_sold,
            COUNT(DISTINCT event_id) AS total_events_held,
            SUM(amount_paid + coupon_discount) AS gross_revenue,
            SUM(voucher_discount) AS marketing_expense,
            SUM(admin_fee_amount) AS administrative_expense,
            SUM(amount_paid + coupon_discount - voucher_discount - admin_fee_amount) AS net_revenue
          FROM "transactions"
          WHERE status = 'DONE'
          ${dateFilter}
          AND organizer_id = ${organizerId}
          GROUP BY period_value
          ORDER BY period_value;
        `;

      const analytic = rawAnalytic.map(
        ({
          gross_revenue,
          administrative_expense,
          marketing_expense,
          net_revenue,
          period_value,
          total_tickets_sold,
          total_events_held,
        }) => {
          const grossRevenue = Number(gross_revenue);
          const administrativeExpense = Number(administrative_expense);
          const marketingExpense = Number(marketing_expense);
          const netRevenue = Number(net_revenue);
          const periodValue = Number(period_value);
          const totalTicketsSold = Number(total_tickets_sold);
          const totalEventsHeld = Number(total_events_held);

          return {
            periodType: period,
            periodValue,
            grossRevenue,
            administrativeExpense,
            marketingExpense,
            netRevenue,
            totalTicketsSold,
            totalEventsHeld,
          };
        }
      );

      const currentYear = new Date().getFullYear();
      const isPastYearData = year ? year < currentYear : false;
      if (isPastYearData) {
        cache.set(cacheKey, analytic);
      }
      analyticCache = analytic;
    }

    return res.json({
      success: true,
      message: "Organizer analytic fetxched successfully!",
      data: analyticCache,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/", isAdmin, async (req, res, next) => {
  try {
    const { success, data, error } = QueryAnalyticSchema.safeParse(req.query);
    if (!success) throw error;

    const { year, month } = data;
    const cacheKey = analyticCacheKey({ role: "admin", month, year });
    let analyticCache = cache.get(cacheKey);
    if (analyticCache) console.log("tdk mengquery");

    if (!analyticCache) {
      console.log("mengkueri");
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      let period: "year" | "month" | "day";

      if (year && !month) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);
        period = "month";
      } else if (year && month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 1);
        period = "day";
      } else {
        period = "year";
      }

      const isEmptyDate = !startDate && !endDate;
      const dateFilter = isEmptyDate
        ? Prisma.empty
        : Prisma.sql`AND completed_at >= ${startDate} AND completed_at < ${endDate}`;

      const rawAnalytic = await prisma.$queryRaw<
        {
          period_value: number;
          total_tickets_sold: number;
          total_events_held: number;
          gross_revenue: number;
          marketing_expense: number;
          net_revenue: number;
        }[]
      >`SELECT
            DATE_PART(${period}, completed_at) AS period_value,
            COUNT(*) AS total_tickets_sold,
            COUNT(DISTINCT event_id) AS total_events_held,
            SUM(admin_fee_amount) AS gross_revenue,
            SUM(coupon_discount) AS marketing_expense,
            SUM(admin_fee_amount - coupon_discount) AS net_revenue
          FROM "transactions"
          WHERE status = 'DONE'
          ${dateFilter}
          GROUP BY period_value
          ORDER BY period_value;
        `;
      const analytic = rawAnalytic.map(
        ({
          gross_revenue,
          marketing_expense,
          net_revenue,
          period_value,
          total_tickets_sold,
          total_events_held,
        }) => {
          const grossRevenue = Number(gross_revenue);
          const marketingExpense = Number(marketing_expense);
          const netRevenue = Number(net_revenue);
          const periodValue = Number(period_value);
          const totalTicketsSold = Number(total_tickets_sold);
          const totalEventsHeld = Number(total_events_held);

          return {
            periodType: period,
            periodValue,
            grossRevenue,
            marketingExpense,
            netRevenue,
            totalTicketsSold,
            totalEventsHeld,
          };
        }
      );
      const currentYear = new Date().getFullYear();
      const isPastYearData = year ? year < currentYear : false;
      if (isPastYearData) {
        cache.set(cacheKey, analytic);
      }
      analyticCache = analytic;
    }

    return res.json({
      success: true,
      message: "Organizer analytic fetxched successfully!",
      data: analyticCache,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
