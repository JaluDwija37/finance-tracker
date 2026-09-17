import "dotenv/config";

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) throw new Error("OWNER_EMAIL dan OWNER_PASSWORD harus diatur");
  if (password.length < 8) throw new Error("OWNER_PASSWORD terlalu pendek");
  const { prisma } = await import("../src/lib/prisma");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    if (await prisma.user.count() > 0) throw new Error("Database sudah memiliki pengguna lain; bootstrap dibatalkan");
    const { betterAuth } = await import("better-auth");
    const { prismaAdapter } = await import("better-auth/adapters/prisma");
    const bootstrapAuth = betterAuth({
      database: prismaAdapter(prisma, { provider: "postgresql" }),
      emailAndPassword: { enabled: true },
    });
    await bootstrapAuth.api.signUpEmail({ body: { name: "Pemilik", email, password } });
  }
  const owner = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.userSettings.upsert({
    where: { userId: owner.id },
    create: { userId: owner.id },
    update: {},
  });
  for (const [name, kind] of [
    ["Gaji", "INCOME"], ["Lainnya", "INCOME"],
    ["Makan", "EXPENSE"], ["Codex", "EXPENSE"], ["Wi-Fi", "EXPENSE"],
    ["Bensin", "EXPENSE"], ["Ngopi", "EXPENSE"], ["Lainnya", "EXPENSE"],
    ["Biaya Investasi", "EXPENSE"],
  ] as const) {
    const exists = await prisma.category.findFirst({ where: { userId: owner.id, name, kind, parentId: null } });
    if (!exists) await prisma.category.create({ data: { userId: owner.id, name, kind } });
  }
  console.log("Akun pemilik dan pengaturan awal siap");
  await prisma.$disconnect();
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap gagal");
  process.exit(1);
});
