import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  customerId: z.string().trim().min(1).optional().nullable(),
  name: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email || undefined,
      },
    });
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
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: id,
      details: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const target = await prisma.customer.findUnique({
    where: { id },
    select: { name: true, customerId: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Installation.customerId is SetNull on delete, so install history keeps
  // its customerName/customerAddress snapshot even after this.
  await prisma.customer.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: id,
      details: `Deleted customer ${target.name ?? target.customerId ?? id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
