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

export async function GET(req: NextRequest) {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const customers = await prisma.customer.findMany({
    where: q ? { customerId: { contains: q, mode: "insensitive" } } : undefined,
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
      details: `Added customer ${customer.customerId}`,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
