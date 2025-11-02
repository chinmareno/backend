import { Request } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "./logger";
import { AuthError } from "../errors/AuthError";
import { supabase } from "../supabase";

export const verifyToken = async (req: Request) => {
  const jwtName = process.env.SUPABASE_JWT_NAME;
  if (!jwtName) {
    logger.error("The SUPABASE_JWT_NAME is missing");
    throw new AppError();
  }
  const jwtValue = req.cookies[jwtName];
  const base64String = jwtValue?.substring(7) as string;
  if (!base64String) throw new AuthError();
  const decodedString = Buffer.from(base64String, "base64").toString("utf-8");
  const session = JSON.parse(decodedString);
  const accessToken = session.access_token;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new AuthError();

  return data;
};
