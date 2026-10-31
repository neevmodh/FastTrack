import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

// Empty-string form fields ("" from an untouched optional input) must be
// treated the same as an omitted field — z.string().min(1).optional() only
// skips validation for `undefined`, not for "", so without this an empty
// optional field fails validation instead of being ignored.
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
const optionalText = () => z.preprocess(blankToUndefined, z.string().trim().min(1).optional());

// customerId is a free-text external reference (account number, code,
// whatever the source system uses) — no format restriction beyond "not
// blank". At least one of customerId/name must be given so a record is
// identifiable by something.
const createSchema = z
  .object({
    customerId: optionalText(),
    name: optionalText(),
    phone: optionalText(),
    address: optionalText(),
    email: z.preprocess(blankToUndefined, z.string().email().optional()),
    notes: optionalText(),
  })
  .refine((d) => d.customerId || d.name, {
    message: "Provide at least a Customer ID or a name.",
  });

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { customerId: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { installations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(customers);
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
      details: `Added customer ${customer.name ?? customer.customerId ?? customer.id}`,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
