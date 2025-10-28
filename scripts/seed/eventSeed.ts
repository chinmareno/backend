import { CATEGORY, LOCATION } from "../../generated/prisma";
import { prisma } from "../../prisma/db";

type EventData = {
  name: string;
  price: number;
  start_date: Date;
  end_date: Date;
  capacity_seat: number;
  available_seat: number;
  description: string;
  category: string[];
  location: string;
}[];

export const eventSeed = async (organizerId: string, eventsData: EventData) => {
  const events = eventsData.map(({ category, location, ...rest }) => ({
    ...rest,
    category: category as CATEGORY[],
    location: location as LOCATION,
    organizer_id: organizerId,
  }));
  await prisma.events.createMany({ data: events });
};
