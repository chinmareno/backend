import { ROLE } from "../../generated/prisma";
import { prisma } from "../../prisma/db";
import { supabase } from "../../supabase";

type UserSeed = {
  email: string;
  username: string;
  password: string;
  role: ROLE;
};

export const userSeed = async ({
  email,
  username,
  password,
  role,
}: UserSeed) => {
  const { data } = await supabase.auth.signUp({ email, password });
  if (!data.user) throw new Error("Signup Failed");

  const isCustomer = role === "CUSTOMER";
  const user = await prisma.users.create({
    data: {
      id: data.user.id,
      username,
      role,
      referral_code: isCustomer ? undefined : null,
      email,
    },
  });

  return user;
};
