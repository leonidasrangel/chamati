import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrações usam a conexão direta (sem pooler) quando disponível.
// Na Vercel + Neon: DATABASE_URL = com pooler (app) · DATABASE_URL_UNPOOLED = direta (migrações).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
