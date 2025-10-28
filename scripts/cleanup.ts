import { prisma } from "../prisma/db";
import { supabase } from "../supabase";
import { logger } from "../utils/logger";

export async function cleanup() {
  await prisma.transactions.deleteMany();
  await prisma.event_ratings.deleteMany();
  await prisma.events.deleteMany();
  await prisma.coupons.deleteMany();
  await prisma.vouchers.deleteMany();
  await prisma.users.deleteMany();
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  for (const { id } of users) await supabase.auth.admin.deleteUser(id);
}

cleanup()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(async () => {
    logger.info("Cleanup Success");
    await prisma.$disconnect();
  });
