import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
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
  const { user, error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
      address: parsed.data.address || undefined,
      email: parsed.data.email || undefined,
      notes: parsed.data.notes || undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      details: `Added customer ${customer.name}`,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
