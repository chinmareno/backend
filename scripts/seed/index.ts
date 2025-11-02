import { faker } from "@faker-js/faker";
import { logger } from "../../utils/logger";
import { cleanup } from "../cleanup";
import { eventsData1, eventsData2 } from "../data/eventsData";
import { couponSeed } from "./couponSeed";
import { eventSeed } from "./eventSeed";
import { transactionSeed } from "./transactionSeed";
import { userSeed } from "./userSeed";
import { transactionVoucherDiscountSeed } from "./transactionModifiersSeed/transactionVoucherDiscountSeed";
import { transactionCouponDiscountSeed } from "./transactionModifiersSeed/transactionCouponDiscountSeed";
import { transactionWithdrawnCoupons } from "./transactionModifiersSeed/transactionWithdrawnCoupons";
import { transactionPayAdminFeeSeed } from "./transactionModifiersSeed/transactionPayAdminFeeSeed";

async function seed() {
  // Make sure no conflict with existing data
  await cleanup();

  const [admin, organizer1, organizer2, customer1, customer2] =
    await Promise.all([
      userSeed({
        email: "chinmareno@admin.com",
        password: "chinmareno",
        role: "ADMIN",
        username: "chinmareno admin",
      }),
      userSeed({
        email: "chinmareno@organizer.com",
        password: "chinmareno",
        role: "ORGANIZER",
        username: "chinmareno organizer",
      }),
      userSeed({
        email: "vedrick@organizer.com",
        password: "vedrick",
        role: "ORGANIZER",
        username: "vedrick organizer",
      }),
      userSeed({
        email: "chinmareno@customer.com",
        password: "chinmareno",
        role: "CUSTOMER",
        username: "chinmareno customer",
      }),
      userSeed({
        email: "nicholas@customer.com",
        password: "nicholas",
        role: "CUSTOMER",
        username: "nicholas customer",
      }),
    ]);

  await couponSeed({ claimer_id: customer1.id, referrer_id: customer2.id });

  const customers = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      userSeed({
        email: `customer${i + 1}@customer.com`,
        password: `customer${i + 1}`,
        role: "CUSTOMER",
        username: `customer${i + 1}`,
      })
    )
  );

  await Promise.all(
    customers.map((customer) => {
      const otherCustomer = faker.helpers.arrayElement(
        customers.filter((c) => c.id !== customer.id)
      );
      return couponSeed({
        claimer_id: customer.id,
        referrer_id: otherCustomer.id,
      });
    })
  );

  await eventSeed(organizer1.id, eventsData1);
  await eventSeed(organizer2.id, eventsData2);

  // Plain transaction seed didn't have any discount attached
  await transactionSeed({
    doneTransactionCount: 5000,
    randomTransactionCount: 100,
    pastYearsRange: 5,
  });
  await transactionVoucherDiscountSeed({ applyChancePercentage: 40 });
  await transactionCouponDiscountSeed({ applyChancePercentage: 20 });

  await transactionWithdrawnCoupons({ applyChancePercentage: 50 });

  await transactionPayAdminFeeSeed({ applyChancePercentage: 50 });
}

seed()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(async () => {
    logger.info("Seed Finish");
  });
