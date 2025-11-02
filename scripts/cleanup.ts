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
  await prisma.withdrawal_batches.deleteMany();
  await prisma.attendees.deleteMany();
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  await Promise.all(users.map(({ id }) => supabase.auth.admin.deleteUser(id)));
}

cleanup()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(async () => {
    logger.info("Cleanup Success");
  });
