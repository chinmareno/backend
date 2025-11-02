import express from "express";
import eventsRouter from "./events";
import vouchersRouter from "./vouchers";
import couponsRouter from "./coupons";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import locationsRouter from "./locations";
import ratingsRouter from "./ratings";
import analyticsRouter from "./analytics";

const router = express.Router();

router.use("/events", eventsRouter);
router.use("/vouchers", vouchersRouter);
router.use("/transactions", transactionsRouter);
router.use("/coupons", couponsRouter);
router.use("/categories", categoriesRouter);
router.use("/locations", locationsRouter);
router.use("/ratings", ratingsRouter);
router.use("/analytics", analyticsRouter);

export default router;
