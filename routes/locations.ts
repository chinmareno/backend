import express from "express";
import { LOCATION } from "../generated/prisma";

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    return res.json({
      success: true,
      message: "Locations option successfully fetched",
      data: LOCATION,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
