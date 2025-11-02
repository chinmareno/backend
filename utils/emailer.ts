import { Resend } from "resend";

export const emailer = new Resend(process.env.RESEND_API_KEY).emails;
