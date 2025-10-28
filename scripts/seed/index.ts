import { prisma } from "../../prisma/db";
import { logger } from "../../utils/logger";
import { cleanup } from "../cleanup";
import { eventsData1, eventsData2 } from "../data/eventsData";
import { couponSeed } from "./couponSeed";
import { eventSeed } from "./eventSeed";
import { userSeed } from "./userSeed";

async function seed() {
  // Make sure no conflict with existing data
  await cleanup();

  const organizer1 = await userSeed({
    email: "chinmareno@admin.com",
    password: "chinmareno",
    role: "ORGANIZER",
    username: "chinmareno admin",
  });
  const organizer2 = await userSeed({
    email: "vedrick@admin.com",
    password: "vedrick",
    role: "ORGANIZER",
    username: "vedrick admin",
  });

  const customer1 = await userSeed({
    email: "chinmareno@customer.com",
    password: "chinmareno",
    role: "CUSTOMER",
    username: "chinmareno customer",
  });
  const customer2 = await userSeed({
    email: "nicholas@customer.com",
    password: "nicholas",
    role: "CUSTOMER",
    username: "nicholas customer",
  });

  await couponSeed({ user_id: customer1.id, other_user_id: customer2.id });

  await eventSeed(organizer1.id, eventsData1);
  await eventSeed(organizer2.id, eventsData2);
}

seed()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(async () => {
    logger.info("Seed Success");
    await prisma.$disconnect();
  });
