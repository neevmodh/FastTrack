import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  macAddress: z.string().min(1).optional(),
  serialNumber: z.string().optional().nullable(),
  ponSerial: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["IN_STOCK", "ASSIGNED", "INSTALLED", "FAULTY", "RETURNED"])
    .optional(),
  assignedToId: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const onu = await prisma.onu.findUnique({
    where: { id },
    include: {
      addedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      installation: {
        include: {
          staff: { select: { id: true, name: true } },
          customer: true,
          replaces: { include: { onu: { select: { id: true, companyName: true, macAddress: true } } } },
          replacedBy: { include: { onu: { select: { id: true, companyName: true, macAddress: true } } } },
        },
      },
      complaints: {
        include: { reportedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!onu) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(onu);
}

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

  // Staff can only self-assign stock items or update status on their own ONUs
  if (user.role === "STAFF") {
    const allowedFields = new Set(["status", "assignedToId"]);
    const keys = Object.keys(parsed.data);
    const disallowed = keys.filter((k) => !allowedFields.has(k));
    if (disallowed.length > 0) {
      return NextResponse.json(
        { error: `Staff cannot edit: ${disallowed.join(", ")}` },
        { status: 403 }
      );
    }
    if (parsed.data.assignedToId && parsed.data.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "Staff can only assign ONUs to themselves" },
        { status: 403 }
      );
    }
  }

  const onu = await prisma.onu.update({
    where: { id },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ONU_UPDATED",
      entityType: "Onu",
      entityId: onu.id,
      details: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json(onu);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser(["OFFICE", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  await prisma.onu.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ONU_DELETED",
      entityType: "Onu",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
