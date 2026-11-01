import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

// Customer ID is a free-text external reference (account number, code, a
// name — whatever the source system uses) and the only field a Customer
// has. No format restriction beyond "not blank".
const createSchema = z.object({
  customerId: z.string().trim().min(1, "Customer ID is required."),
});

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Must be a valid date.");

const getQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  hasInstalls: z.enum(["yes", "no"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const parsedQuery = getQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    hasInstalls: searchParams.get("hasInstalls") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }
  const { q, hasInstalls, from, to } = parsedQuery.data;
  // take=0 (used by CSV export) means "no limit" — return every matching row.
  const takeParam = searchParams.get("take");
  const take = takeParam === null ? 50 : Math.min(Math.max(Number(takeParam) || 0, 0), 5000);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where: Prisma.CustomerWhereInput = {
    ...(q ? { customerId: { contains: q, mode: "insensitive" } } : {}),
    ...(hasInstalls === "yes" ? { installations: { some: {} } } : {}),
    ...(hasInstalls === "no" ? { installations: { none: {} } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(new Date(to).getTime() + 86400000) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { installations: true } } },
      // createdAt alone isn't a stable sort — bulk imports insert many rows
      // with the identical timestamp, which causes duplicate/missing rows
      // across pages under skip/take. id is a tiebreaker, not a real order.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(take > 0 ? { take, skip } : {}),
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let customer;
  try {
    customer = await prisma.customer.create({ data: parsed.data });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A customer with this Customer ID already exists." },
        { status: 409 }
      );
    }
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      details: `Added customer ${customer.customerId}`,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
