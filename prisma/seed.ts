/**
 * Cria a conta de administrador inicial a partir de variáveis de ambiente.
 *   npm run db:seed   (também roda no build de produção: npm run build:prod)
 *
 *   ADMIN_EMAIL     e-mail de login do administrador
 *   ADMIN_NAME      nome exibido (padrão: "Administrador")
 *   ADMIN_PASSWORD  senha inicial, mínimo 8 caracteres
 *
 * É idempotente: se já existir algum usuário com perfil ADMIN, não faz nada.
 * Depois do primeiro deploy, ADMIN_PASSWORD pode ser removida das variáveis.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins > 0) {
    console.log(`Administrador já existe (${admins}); nada a fazer.`);
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || "Administrador";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    console.warn(
      "⚠ Nenhum administrador no banco e ADMIN_EMAIL/ADMIN_PASSWORD não definidas — ninguém conseguirá entrar. " +
        "Defina as variáveis e rode de novo (ou faça um novo deploy).",
    );
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");

  const passwordHash = await bcrypt.hash(password, 10);
  // Se o e-mail já existe (ex.: era técnico), promove a administrador e redefine a senha
  await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN", active: true, passwordHash },
    create: { email, name, role: "ADMIN", passwordHash },
  });
  console.log(`Administrador criado: ${name} <${email}>`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
