import express from "express";
import eventsRouter from "./events";
import vouchersRouter from "./vouchers";
import couponsRouter from "./coupons";
import transactionsRouter from "./transactions";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import locationsRouter from "./locations";
import ratingsRouter from "./ratings";

const router = express.Router();

router.use("/events", eventsRouter);
router.use("/vouchers", vouchersRouter);
router.use("/transactions", transactionsRouter);
router.use("/coupons", couponsRouter);
router.use("/users", usersRouter);
router.use("/categories", categoriesRouter);
router.use("/locations", locationsRouter);
router.use("/ratings", ratingsRouter);

export default router;
