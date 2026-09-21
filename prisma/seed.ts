import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSION_DEFS, ROLE_DEFS, ROLE_KEYS } from "../src/lib/auth/permissions";
import { TEMPLATE_DEFAULTS, TEMPLATE_KEYS } from "../src/lib/whatsapp/templates";
import { slugify } from "../src/utils/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const J = (jod: number) => Math.round(jod * 1000); // JOD → fils
const U = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

async function wipe() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'`;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (names) await db.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

async function main() {
  const force = process.argv.includes("--force");
  if ((await db.restaurant.count()) > 0) {
    if (!force) {
      console.log("Database already has data. Re-run with `npm run db:seed -- --force` to wipe and reseed.");
      return;
    }
    await wipe();
  }
  console.log("Seeding clean data…");

  // ── Roles & permissions ──────────────────────────────────────────────
  await db.permission.createMany({ data: PERMISSION_DEFS.map((p) => ({ key: p.key, group: p.group, description: p.description })) });
  const perms = await db.permission.findMany();
  for (const key of ROLE_KEYS) {
    const def = ROLE_DEFS[key];
    await db.role.create({
      data: {
        key,
        name: def.name,
        description: def.description,
        rank: def.rank,
        permissions: { create: def.permissions.map((pk) => ({ permissionId: perms.find((p) => p.key === pk)!.id })) },
      },
    });
  }
  const roles = Object.fromEntries((await db.role.findMany()).map((r) => [r.key, r.id]));

  // ── Restaurant ───────────────────────────────────────────────────────
  const restaurant = await db.restaurant.create({
    data: {
      name: "Lumière",
      tagline: "Savor the moment",
      description: "A seasonal Levantine menu inspired by locally sourced ingredients, thoughtfully prepared and beautifully served.",
      story: "At Lumière, the kitchen follows the seasons. Local produce meets classic Jordanian technique, open-flame cooking and a carefully considered drinks programme.",
      logoUrl: null,
      coverImageUrl: U("1544025162-d76694265947", 2200),
      phone: "+962 6 465 0100",
      whatsappNumber: "+962790000123",
      email: "hello@yourcompany.com",
      address: "Rainbow Street, Jabal Amman",
      city: "Amman, Jordan",
      latitude: 31.9522,
      longitude: 35.9234,
      currency: "JOD",
      taxRate: 16,
      serviceFeeRate: 0,
      minOrderAmount: J(5),
    },
  });

  // ── Staff ────────────────────────────────────────────────────────────
  const staffSeed = [
    { keyId: "owner", name: "Layla Haddad", email: "owner@yourcompany.com", role: "SUPER_ADMIN", position: "Owner", phone: "+962790010001", password: "OwnerPassword2026!" },
    { keyId: "admin", name: "Ahmed Nasser", email: "admin@yourcompany.com", role: "ADMIN", position: "General manager", phone: "+962790010002", password: "AdminPassword123!" },
    { keyId: "manager", name: "Sana Odeh", email: "manager@yourcompany.com", role: "MANAGER", position: "Floor manager", phone: "+962790010003", password: "ManagerPassword123!" },
    { keyId: "cashier", name: "Hiba Rifai", email: "cashier@yourcompany.com", role: "CASHIER", position: "Front desk", phone: "+962790010004", password: "CashierPassword123!" },
    { keyId: "kitchen", name: "Mahmoud Tamimi", email: "kitchen@yourcompany.com", role: "KITCHEN", position: "Head chef", phone: "+962790010005", password: "KitchenPassword123!" },
    { keyId: "driver", name: "Ziad Alawneh", email: "driver1@yourcompany.com", role: "DELIVERY", position: "Driver", phone: "+962790000006", password: "DriverPassword123!" },
    { keyId: "driver2", name: "Rami Khasawneh", email: "driver2@yourcompany.com", role: "DELIVERY", position: "Driver", phone: "+962790000007", password: "DriverPassword123!" },
  ] as const;

  for (const s of staffSeed) {
    const userHash = await bcrypt.hash(s.password, 12);
    await db.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: userHash,
        roleId: roles[s.role]!,
        staff: { create: { phone: s.phone, position: s.position, hiredAt: new Date() } },
      },
    });
  }

  // ── Delivery zones ───────────────────────────────────────────────────
  const zoneSeed = [
    { name: "Jabal Amman", fee: 1, min: 5, eta: 30 },
    { name: "Abdoun", fee: 1.5, min: 8, eta: 35 },
    { name: "Shmeisani", fee: 1.5, min: 8, eta: 35 },
    { name: "Sweifieh", fee: 2, min: 10, eta: 40 },
  ];
  for (const [i, z] of zoneSeed.entries()) {
    await db.deliveryZone.create({
      data: { name: z.name, fee: J(z.fee), minOrder: J(z.min), etaMinutes: z.eta, isActive: true, sortOrder: i },
    });
  }

  // ── Menu ─────────────────────────────────────────────────────────────
  const catSeed = [
    { name: "Appetizers", description: "Mezze to share", img: "1546069901-ba9599a7e63c" },
    { name: "Main dishes", description: "Slow-cooked classics", img: "1504674900247-0877df9cc836" },
    { name: "Burgers", description: "Hand-pressed patties", img: "1568901346375-23c9450c58cd" },
    { name: "Drinks", description: "Fresh juices", img: "1544145945-f90425340c7e" },
    { name: "Desserts", description: "Sweet endings", img: "1578985545062-69928b1d9587" },
  ];
  const cats: Record<string, string> = {};
  for (const [i, c] of catSeed.entries()) {
    const row = await db.category.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, imageUrl: U(c.img, 1000), sortOrder: i },
    });
    cats[c.name] = row.id;
  }

  // أمثلة بسيطة وأساسية للأطباق
  await db.product.create({
    data: {
      name: "Jordanian Lamb Mansaf",
      slug: "jordanian-lamb-mansaf",
      description: "Tender lamb over saffron rice with jameed sauce.",
      price: J(12.5),
      imageUrl: U("1504674900247-0877df9cc836"),
      categoryId: cats["Main dishes"]!,
      isFeatured: true,
      isAvailable: true,
    },
  });

  await db.product.create({
    data: {
      name: "Grilled Halloumi",
      slug: "grilled-halloumi",
      description: "Seared halloumi with honey and thyme.",
      price: J(5.25),
      discountPrice: J(4.5), // هذا الطبق سيظهر في الـ Special Offers لأن له سعر خصم!
      imageUrl: U("1550966871-3ed3cdb5ed0c"),
      categoryId: cats["Appetizers"]!,
      isFeatured: true,
      isAvailable: true,
    },
  });

  // ── Templates ────────────────────────────────────────────────────────
  for (const key of TEMPLATE_KEYS) {
    await db.messageTemplate.create({ data: { key, name: TEMPLATE_DEFAULTS[key].name, body: TEMPLATE_DEFAULTS[key].body } });
  }

  console.log("Clean seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());