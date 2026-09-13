// Optional seed data. Safe to run multiple times.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      googleId: "seed-demo-google-id",
      name: "Demo User",
      email: "demo@example.com",
      avatar: null,
    },
  });

  console.log(`Seed complete. Demo user id: ${user.id}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
