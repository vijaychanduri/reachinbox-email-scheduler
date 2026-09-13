import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app (avoids exhausting
// PostgreSQL connections when the file gets imported multiple times).
export const prisma = new PrismaClient();
