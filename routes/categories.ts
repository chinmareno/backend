import express from "express";
import { CATEGORY } from "../generated/prisma";

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    return res.json({
      success: true,
      message: "Category option successfully fetched",
      data: CATEGORY,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
