import { CATEGORY, LOCATION } from "../../generated/prisma";

type Event = {
  category: CATEGORY[];
  location: LOCATION;
  organizer_id: string;
  name: string;
  price: number;
  start_date: Date;
  end_date: Date;
  capacity_seat: number;
  available_seat: number;
  description: string;
};

export const eventsData1 = [
  {
    name: "Jakarta Business Founder Meetup 2026",
    price: 55000,
    start_date: new Date("2026-09-18"),
    end_date: new Date("2026-09-18"),
    capacity_seat: 180,
    available_seat: 180,
    description:
      "Investor networking and pitch discussions for early-stage founders.",
    category: ["BUSINESS", "NETWORKING", "CONFERENCE"],
    location: "JAKARTA",
  },
  {
    name: "Bandung Street Food Festival 2026",
    price: 25000,
    start_date: new Date("2026-10-11"),
    end_date: new Date("2026-10-13"),
    capacity_seat: 600,
    available_seat: 600,
    description:
      "Vendors showcasing iconic Indonesian street food specialties.",
    category: ["FOOD", "FESTIVAL"],
    location: "BANDUNG",
  },
  {
    name: "Surabaya Charity Night Run 2026",
    price: 8000,
    start_date: new Date("2026-11-14"),
    end_date: new Date("2026-11-14"),
    capacity_seat: 900,
    available_seat: 900,
    description: "A city marathon raising funds for healthcare programs.",
    category: ["SPORTS", "CHARITY"],
    location: "SURABAYA",
  },
  {
    name: "Medan Health Lifestyle Expo 2026",
    price: 45000,
    start_date: new Date("2026-12-02"),
    end_date: new Date("2026-12-03"),
    capacity_seat: 260,
    available_seat: 260,
    description:
      "Health consultants offering tips on nutrition and medication safety.",
    category: ["HEALTH", "WORKSHOP"],
    location: "MEDAN",
  },
  {
    name: "Bali International Esports Cup 2026",
    price: 85000,
    start_date: new Date("2026-12-16"),
    end_date: new Date("2026-12-18"),
    capacity_seat: 700,
    available_seat: 700,
    description: "Top gaming teams compete in a multi-title championship.",
    category: ["GAMING", "CONFERENCE"],
    location: "BALI",
  },
  {
    name: "Makassar Experimental Theater Week 2026",
    price: 20000,
    start_date: new Date("2026-10-06"),
    end_date: new Date("2026-10-09"),
    capacity_seat: 130,
    available_seat: 130,
    description: "Modern performances with immersive audience interaction.",
    category: ["THEATER", "ART"],
    location: "MAKASSAR",
  },
  {
    name: "Yogyakarta EdTech Innovation Forum 2026",
    price: 110000,
    start_date: new Date("2026-11-27"),
    end_date: new Date("2026-11-28"),
    capacity_seat: 240,
    available_seat: 240,
    description: "Educators discuss AI-powered personalized learning systems.",
    category: ["EDUCATION", "TECHNOLOGY"],
    location: "YOGYAKARTA",
  },
] as Event[];

export const eventsData2 = [
  {
    name: "Jakarta Indie Music Fest 2026",
    price: 32000,
    start_date: new Date("2026-09-17"),
    end_date: new Date("2026-09-17"),
    capacity_seat: 450,
    available_seat: 450,
    description:
      "Emerging indie artists performing live acoustic and electric sets.",
    category: ["MUSIC", "FESTIVAL"],
    location: "JAKARTA",
  },
  {
    name: "Bandung Traditional Art Workshop 2026",
    price: 12000,
    start_date: new Date("2026-10-09"),
    end_date: new Date("2026-10-10"),
    capacity_seat: 280,
    available_seat: 280,
    description:
      "Interactive workshop focused on traditional handicraft skills.",
    category: ["ART", "WORKSHOP"],
    location: "BANDUNG",
  },
  {
    name: "Surabaya Stand-Up Comedy Clash 2026",
    price: 7000,
    start_date: new Date("2026-10-21"),
    end_date: new Date("2026-10-21"),
    capacity_seat: 210,
    available_seat: 210,
    description:
      "Comedians face off in audience-scored battles for first place.",
    category: ["COMEDY", "THEATER"],
    location: "SURABAYA",
  },
  {
    name: "Medan Fitness Bootcamp Summit 2026",
    price: 23000,
    start_date: new Date("2026-11-06"),
    end_date: new Date("2026-11-07"),
    capacity_seat: 140,
    available_seat: 140,
    description: "Bootcamp training with certified strength coaches.",
    category: ["FITNESS", "HEALTH"],
    location: "MEDAN",
  },
  {
    name: "Bali Global Gaming Expo 2026",
    price: 62000,
    start_date: new Date("2026-11-13"),
    end_date: new Date("2026-11-14"),
    capacity_seat: 950,
    available_seat: 950,
    description:
      "Hardware demos, publisher talks, and indie developer showcases.",
    category: ["GAMING", "CONFERENCE"],
    location: "BALI",
  },
  {
    name: "Makassar Street Art Festival 2026",
    price: 18000,
    start_date: new Date("2026-12-02"),
    end_date: new Date("2026-12-04"),
    capacity_seat: 230,
    available_seat: 230,
    description: "Live mural painting and open-air graffiti exhibits.",
    category: ["ART", "FESTIVAL"],
    location: "MAKASSAR",
  },
  {
    name: "Yogyakarta Coding Workshop 2026",
    price: 0,
    start_date: new Date("2026-12-11"),
    end_date: new Date("2026-12-12"),
    capacity_seat: 120,
    available_seat: 120,
    description: "Beginner and intermediate coding sessions held by educators.",
    category: ["EDUCATION", "WORKSHOP"],
    location: "YOGYAKARTA",
  },
  {
    name: "Denpasar Charity Food Drive 2026",
    price: 0,
    start_date: new Date("2026-12-18"),
    end_date: new Date("2026-12-18"),
    capacity_seat: 380,
    available_seat: 380,
    description:
      "A community event distributing free meals for low-income families.",
    category: ["CHARITY", "FOOD"],
    location: "DENPASAR",
  },
  {
    name: "Jakarta Tourism Networking Gala 2026",
    price: 27000,
    start_date: new Date("2026-12-20"),
    end_date: new Date("2026-12-20"),
    capacity_seat: 290,
    available_seat: 290,
    description: "A formal networking night for tourism partners and guides.",
    category: ["TRAVEL", "NETWORKING"],
    location: "JAKARTA",
  },
  {
    name: "Bandung Future Classroom Conference 2026",
    price: 0,
    start_date: new Date("2026-12-22"),
    end_date: new Date("2026-12-22"),
    capacity_seat: 240,
    available_seat: 240,
    description:
      "Discussions on virtual learning environments and AI enhancement.",
    category: ["EDUCATION", "TECHNOLOGY", "CONFERENCE"],
    location: "BANDUNG",
  },
] as Event[];
